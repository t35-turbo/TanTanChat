import { Hono } from "hono";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chatMessages } from "./db/schema";
import { eq, desc, lt, and, asc, gt } from "drizzle-orm";
import * as sync from "./sync";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();
const PORT = process.env.PORT || 3001;

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

app.post("/api/chats/new", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const { message } = await c.req.json();

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!message || typeof message !== "string" || message.trim() === "") {
    return c.json({ error: "Invalid message" }, 400);
  }

  const newChat = {
    id: crypto.randomUUID(),
    userId: user.id,
    title: "New Chat",
    lastUpdated: new Date(),
  };

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

  const chat = (await db.select().from(chats).where(eq(chats.id, chatId)))?.[0];
  if (!chat || chat.userId !== user.id) {
    return c.json({ error: "Unauthorized" }, 401);
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

  if (!messages.length) {
    return c.json({ messages: [] });
  }

  messages = messages.map((msg) => ({
    id: msg.id,
    chatId: msg.chatId,
    senderId: msg.senderId,
    message: msg.message,
    role: msg.role,
    createdAt: msg.createdAt,
  }));

  return c.json({ messages, cursor }, 200);
});

app.post("/api/chats/:id/new", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const { message } = await c.req.json();
  const chatId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!chatId) {
    return c.json({ error: "Invalid chat ID" }, 400);
  }
  if (!message || message.trim() === "") {
    return c.json({ error: "Invalid message" }, 400);
  }
  const chat = (await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.userId, user.id))))?.[0];
  if (!chat) {
    return c.json({ error: "Not Found" }, 404);
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
  let messages: sync.Messages = await db.select().from(chatMessages).where(eq(chatMessages.chatId, chatId));

  return c.json({ msgId: await sync.newMessage(messages) }, 201);
});

export default {
  port: PORT,
  fetch: app.fetch,
};
