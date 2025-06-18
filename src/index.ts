import { Hono } from "hono";
import { auth } from "./lib/auth";
import { db } from "./db";
import { userSettings } from "./db/schema";
import { eq, and } from "drizzle-orm";
import * as sync from "./sync";
import { z } from "zod";
import { createBunWebSocket, serveStatic } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { filesApp } from "./files";
import chatsApp from "./chats";
import env from "./lib/env";

const PORT = 3001;

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

if (env.NODE_ENV === "development") {
  console.log("[DEBUG] Discord environment variables:");
  console.log("[DEBUG] DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID);
  console.log("[DEBUG] DISCORD_CLIENT_SECRET:", process.env.DISCORD_CLIENT_SECRET);
  console.log("[DEBUG] REDIS_URL:", process.env.REDIS_URL);
  console.log("[DEBUG] REDIS_PASSWORD:", process.env.REDIS_PASSWORD);
  console.log("[DEBUG] PORT:", PORT);
  console.log("[DEBUG] DATABASE_URL:", process.env.DATABASE_URL);
  console.log("[DEBUG] AUTH_SECRET:", process.env.AUTH_SECRET);
}

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

(async () => {
  try {
    await db.select().from(userSettings).limit(1);
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
})();

app.get("/health", async (c) => {
  try {
    // Check database connectivity
    await db.select().from(userSettings).limit(1);

    return c.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "backend",
      },
      200,
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        service: "backend",
      },
      503,
    );
  }
});

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  console.log(c.req.method, c.req.path, new Date().toUTCString());

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/heartbeat", (c) => c.text("OK"));

app.get("/api/user/settings/:key", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const key = c.req.param("key");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const val = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));

  return c.json({ value: val.length > 0 ? val[0] : null });
});

app.put("/api/user/settings/:key", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const key = c.req.param("key");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!key) {
    return c.json({ error: "Setting key is required" }, 400);
  }

  const body = await c.req.json();
  const { value } = body;

  if (value === undefined || value === null) {
    return c.json({ error: "Value is required" }, 400);
  }

  try {
    // Check if setting already exists
    const existingSetting = await db
      .select()
      .from(userSettings)
      .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));

    if (existingSetting.length > 0) {
      // Update existing setting
      await db
        .update(userSettings)
        .set({
          value: String(value),
          updatedAt: new Date(),
        })
        .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));
    } else {
      // Create new setting
      await db.insert(userSettings).values({
        userId: user.id,
        key: key,
        value: String(value),
      });
    }

    return c.json({ message: "Setting updated successfully" }, 200);
  } catch (error) {
    console.error("Error updating user setting:", error);
    return c.json({ error: "Failed to update setting" }, 500);
  }
});

app.route("/api/chats", chatsApp);
app.route("/api/files", filesApp);

app.use("/*", serveStatic({ root: "./client/dist" }));

// SPA fallback - serve index.html for non-API 404s
app.notFound(async (c) => {
  // If the request is for an API route, return 404
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  
  // For all other routes, serve index.html (SPA routing)
  const file = Bun.file('./client/dist/index.html');
  const content = await file.text();
  return new Response(content, {
    headers: { 'Content-Type': 'text/html' },
  });
});

// TODO: add one for general non-chat window
app.get(
  "/api/chats/:id/ws",
  upgradeWebSocket((c) => {
    const session = c.get("session");
    const user = c.get("user");
    const chatId = c.req.param("id");

    // If session or user is not available, throw an error for now. TODO: use proper middleware  (e.g. the route you see intercepting requests bound to *)
    if (!session || !user) {
      throw new Error("Unauthorized, you must log in to use this feature");
    }
    if (!chatId || typeof chatId !== "string") {
      throw new Error("No Chat ID");
    }

    return {
      onOpen(_evt, ws) {
        sync.chatEventWsHandler(chatId, ws);
        sync.userEventWsHandler(user.id, ws);
      },

      onMessage(evt, ws) {
        const callParse = z
          .object({
            jsonrpc: z.literal("2.0"),
            method: z.string(),
            params: z.any(),
            id: z.union([z.string(), z.number()]).optional(),
          })
          .safeParse(JSON.parse(evt.data.toString()));
        if (callParse.error) {
          ws.send(JSON.stringify({ jsonrpc: "2.0", method: "invalid_call" }));
          return;
        }

        const call = callParse.data;
        switch (call.method) {
          case "subscribe":
            sync.wsMessageSubscriber(call.params, ws);
            break;
          default:
            break;
        }
      },
    };
  }),
);

export default {
  port: PORT,
  fetch: app.fetch,
  websocket,
};
