import { Hono } from 'hono'
import { auth } from './lib/auth';
import { db } from './db';
import { chats } from './db/schema';
import { eq, and } from 'drizzle-orm';

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null
  }
}>
const PORT = process.env.PORT || 3001;

app.get('/', (c) => {
  return c.text('nyanya')
})

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

app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

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
  const chatData = userChats.map(chat => ({
    id: chat.id,
    title: chat.title,
    lastUpdated: chat.lastUpdated
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

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return c.json({ error: "Invalid message" }, 400);
  }

  const newChat = {
    id: crypto.randomUUID(),
    userId: user.id,
    title: "New Chat",
    lastUpdated: new Date()
  };

  await db.insert(chats).values(newChat);
  return c.json({uuid: newChat.id}, 201)
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
  const existingChat = await db.select().from(chats).where(
    and(eq(chats.id, chatId), eq(chats.userId, user.id))
  );

  if (existingChat.length === 0) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // Delete the chat
  await db.delete(chats).where(
    and(eq(chats.id, chatId), eq(chats.userId, user.id))
  );

  return c.json({ message: "Chat deleted successfully" }, 200);
});

export default {
  port: PORT,
  fetch: app.fetch,
};
