import { Hono } from "hono";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chatMessages, userSettings } from "./db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import sync from "./sync"; // Remove the asterisk
import { z } from "zod";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";
import { mkdir, readdir } from "node:fs/promises";
import * as crypto from "crypto";
import { filesApp } from "./files";
import chatsApp from "./chats";

const PORT = process.env.PORT || 3001;

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.get("/", (c) => {
  return c.text("nyanya");
});

// Health check endpoint for readiness and liveness probes
app.get("/health", async (c) => {
  try {
    // Check database connectivity
    await db.select().from(userSettings).limit(1);

    // You can add more health checks here if needed:
    // - Redis connectivity
    // - File system access
    // - External service dependencies

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
