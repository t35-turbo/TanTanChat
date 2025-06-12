import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chatMessages } from "./db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import * as sync from "./sync";
import z from "zod";
import { createBunWebSocket } from "hono/bun";
import type { ServerWebSocket } from "bun";

const PORT = process.env.PORT || 3001;

const { upgradeWebSocket, websocket } =
  createBunWebSocket<ServerWebSocket>()

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

  sync.titleGenerator(newChat.id, message, opts);

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

  messages = messages.map((msg) => ({
    id: msg.id,
    chatId: msg.chatId,
    senderId: msg.senderId,
    message: msg.message,
    role: msg.role,
    createdAt: msg.createdAt,
  }));

  return c.json({ messages, cursor: cursor }, 200);
});

app.get("/api/chats/:id/events", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");

  if (!session || !user) {
    // unauth mode
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId) {
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

  return streamSSE(c, async (stream) => {
    // Send a blank message every second
    const heartbeatInterval = setInterval(() => {
      stream.writeSSE({
        data: "",
        event: "heartbeat",
      });
    }, 2500);

    try {
      for await (const operation of sync.createChatEventSubscriber(chatId)) {
        let split = (operation + "").indexOf(" ");
        let [event, data] = [operation.slice(0, split), operation.slice(split + 1)];
        if (operation) {
          stream.writeSSE({
            data,
            event,
          });
        }
      }
    } finally {
      clearInterval(heartbeatInterval);
    }
  });
});

app.get("/api/chats/:id/activeMessage", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");

  if (!session || !user) {
    // unauth mode
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId) {
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

  return c.json({ id: (await sync.getActiveMessage(chatId)) ?? "" });
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
  let messages: sync.Messages = await db.select().from(chatMessages).where(eq(chatMessages.chatId, chatId)).orderBy(asc(chatMessages.createdAt));
  sync.broadcastNewMessage(chatId);

  return c.json({ msgId: await sync.newMessage(chatId, user.id, messages, opts) }, 201);
});

app.get("/api/msg/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const msgId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized, you must log in to use this feature" }, 401);
  }

  const chatId = c.req.param("id");
  if (!chatId || typeof chatId !== "string") {
    return c.json({ error: "Invalid chat ID" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const msgStream = await sync.msgSubscribe(msgId);
    let finish = false;
    for (let sub = await msgStream.next(); !finish; sub = await msgStream.next()) {
      let chunkId = 0;
      const message = sub;
      await stream.writeSSE({
        id: String(chunkId++),
        data: message.reduce((prev, cur) => prev + cur.content, ""),
        event: "message",
      });
      finish = sub.reduce((prev, cur) => prev || cur.finish_reason !== "", false);
    }
  });
});

app.get("/api/chats/:id/ws", 
  upgradeWebSocket((c) => {
    const session = c.get("session");
    const user = c.get("user");
    const chatId = c.req.param("id");


    // If session or user is not available, throw an error for now. TODO: use proper middleware  (e.g. the route you see intercepting requests bound to *)
    if (!session || !user) {
      throw new Error("Unauthorized, you must log in to use this feature");
    }
    if (!chatId || typeof chatId !== "string") {
      throw new Error("Invalid chat ID");
    }

    return {
      onMessage(event, ws) {
        // When a message from the client is received, start the event subscription.
        // WebSocket is bidirectional so you can also handle client messages here.
        (async () => {
          // Send a heartbeat every 2500 ms (as in the events route)
          const heartbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({
              event: "heartbeat",
              data: "",
            }));
          }, 2500);

          console.log("WebSocket connection established for chat:", chatId);

          try {
            // Subscribe to chat events via sync.createChatEventSubscriber
            for await (const operation of sync.createChatEventSubscriber(chatId)) {
              // Split the operation into event and data, similar to the SSE logic.
              const splitIndex = operation.indexOf(" ");
              const eventName = operation.slice(0, splitIndex);
              const data = operation.slice(splitIndex + 1);
              // console.log(`WebSocket event: ${eventName}, data: ${data}`);
              if (operation) {
                ws.send(JSON.stringify({
                  event: eventName,
                  data: data,
                }));
              }
              console.log(`Received event: ${eventName} with data: ${data}`);
              if (eventName === "activeMessage") {
                // If the event is activeMessage, send the message stream like in the /msg/:id route
                const msgStream = await sync.msgSubscribe(data);
                let finish = false;
                let chunkId = 0;
                for (let sub = await msgStream.next(); !finish; sub = await msgStream.next()) {
                  const message = sub;
                  ws.send(JSON.stringify({
                    id: String(chunkId++),
                    data: message.reduce((prev, cur) => prev + cur.content, ""),
                    event: "newMessage",
                  }));
                  finish = sub.reduce((prev, cur) => prev || cur.finish_reason !== "", false);
                }
                console.log(`Finished message stream for chat: ${chatId}`);
              }
            }
          } finally {
            clearInterval(heartbeatInterval);
          }
        })().catch(err => {
          console.error("Error in event stream:", err);
          ws.send(JSON.stringify({ event: "error", data: "Stream error occurred" }));
        });
      },
      onClose(ws) {
        console.log("WebSocket connection closed for chat:", chatId);
      }
    };
  })
);

export default {
  port: PORT,
  fetch: app.fetch,
  websocket
};
