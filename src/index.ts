import { trpcServer } from "@hono/trpc-server";
import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { createBunWebSocket, serveStatic } from "hono/bun";
import { z } from "zod/v4";
import { adminRouter } from "./admin";
import { chatRouter } from "./chats";
import { seedDefaults } from "./db";
import { filesRouter } from "./files";
import { auth } from "./lib/auth";
import { settingsRouter } from "./settings";
import * as sync from "./sync";
import { router } from "./trpc";

const PORT = 3001;

// Initialize default roles
await seedDefaults();

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();

const appRouter = router({
  chats: chatRouter,
  files: filesRouter,
  settings: settingsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

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

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => {
      return {
        user: c.get("user"),
        session: c.get("session"),
      };
    },
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/heartbeat", (c) => c.text("OK"));

app.use("/*", serveStatic({ root: "./client/dist" }));

// SPA fallback - serve index.html for non-API 404s
app.notFound(async (c) => {
  // If the request is for an API route, return 404
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Not Found" }, 404);
  }

  // For all other routes, serve index.html (SPA routing)
  const file = Bun.file("./client/dist/index.html");
  const content = await file.text();
  return new Response(content, {
    headers: { "Content-Type": "text/html" },
  });
});

app.get(
  "/api/chats/:id/ws",
  upgradeWebSocket((c) => {
    const session = c.get("session");
    const user = c.get("user");
    const chatId = c.req.param("id");

    // If session or user is not available, throw an error for now.
    // TODO: use proper middleware  (e.g. the route you see intercepting requests bound to *)
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
