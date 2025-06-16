import { Hono } from "hono";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chatMessages, userSettings } from "./db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import * as sync from "./sync";
import { z } from "zod";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";

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

app.get("/api/chats", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userChats = await db.select().from(chats).where(eq(chats.userId, user.id));
  if (userChats.length === 0) {
    return c.json({ chats: [] });
  }
  const chatData = userChats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    lastUpdated: chat.lastUpdated,
  }));

  return c.json({ chats: chatData });
});

const NewChatBody = z.object({
  message: z.string(),
  opts: z.object({
    apiKey: z.string(),
    model: z.string(),
  }),
});
app.post("/api/chats/new", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const body = await NewChatBody.safeParseAsync(await c.req.json());

  // TODO: allow unauth
  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (body.error) {
    return c.json({ error: "Invalid message" }, 400);
  }
  const { message, opts } = body.data;

  const newChat = {
    id: crypto.randomUUID(),
    userId: user.id,
    title: "New Chat",
    lastUpdated: new Date(),
  };

  sync.titleGenerator(newChat.id, message, [user.id], opts);

  await db.insert(chats).values(newChat);
  return c.json({ uuid: newChat.id }, 201);
});

app.delete("/api/chats/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId) {
    return c.json({ error: "Chat ID is required" }, 400);
  }

  // Check if the chat exists and belongs to the user
  const existingChat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)));

  if (existingChat.length === 0) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // Delete the chat
  await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, user.id)));

  return c.json({ message: "Chat deleted successfully" }, 200);
});

app.get("/api/chats/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");

  // Get query parameters from URL
  const CHUNK_RANGE = 100;
  const cursor = parseInt(c.req.query("cursor") ?? "0");
  const descending = c.req.query("descending") === "true";

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId || typeof chatId !== "string") {
    return c.json({ error: "Invalid chat ID" }, 400);
  }

  const chat = (
    await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
  )?.[0];
  if (!chat) {
    return c.json({ error: "Not Found" }, 404);
  }

  if (isNaN(cursor)) {
    return c.json({ error: "Invalid Cursor" }, 400);
  }

  let messages;
  const offsetValue = cursor * CHUNK_RANGE;
  const limitValue = (cursor + 1) * CHUNK_RANGE - offsetValue;

  messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(descending ? desc(chatMessages.createdAt) : asc(chatMessages.createdAt))
    .offset(offsetValue)
    .limit(limitValue);

  return c.json({ messages, cursor: cursor }, 200);
});

app.post("/api/chats/:id/new", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const { message, opts } = await c.req.json();
  const chatId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!chatId) {
    return c.json({ error: "Invalid chat ID" }, 400);
  }
  if (!message || message.trim() === "") {
    return c.json({ error: "Invalid message", message: message }, 400);
  }
  const chat = (
    await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
  )?.[0];
  if (!chat) {
    return c.json({ error: "Not Found" }, 404);
  }

  if (await sync.getActiveMessage(chatId)) {
    return c.json({ error: "Chat is Busy" }, 409);
  }

  const newMessage: {
    id: string;
    chatId: string;
    senderId: string;
    role: "user";
    message: string;
    createdAt: Date;
  } = {
    id: crypto.randomUUID(),
    chatId: chatId,
    senderId: user.id,
    role: "user",
    message: message,
    createdAt: new Date(),
  };

  await db.insert(chatMessages).values(newMessage);
  let messages: sync.Messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt));
  sync.broadcastNewMessage(chatId);

  return c.json({ msgId: await sync.newMessage(chatId, user.id, messages, opts) }, 201);
});

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

    // Track active subscriptions to prevent duplicates
    const activeSubscriptions = new Set<string>();

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
            sync.chatEventWsHandler(chatId, ws);
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
