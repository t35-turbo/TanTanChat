import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chatMessages } from "./db/schema";
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

// app.get("/api/chats/:id/events", async (c) => {
//   const session = c.get("session");
//   const user = c.get("user");
//   const chatId = c.req.param("id");

//   if (!session || !user) {
//     // unauth mode
//     return c.json({ error: "Unauthorized" }, 401);
//   }

//   if (!chatId) {
//     return c.json({ error: "Invalid chat ID" }, 400);
//   }

//   const chat = (
//     await db
//       .select()
//       .from(chats)
//       .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
//   )?.[0];
//   if (!chat) {
//     return c.json({ error: "Not Found" }, 404);
//   }

//   return streamSSE(c, async (stream) => {
//     // Send a blank message every second
//     const heartbeatInterval = setInterval(() => {
//       stream.writeSSE({
//         data: "",
//         event: "heartbeat",
//       });
//     }, 2500);

//     try {
//       for await (const operation of sync.createChatEventSubscriber(chatId)) {
//         let split = (operation + "").indexOf(" ");
//         let [event, data] = [operation.slice(0, split), operation.slice(split + 1)];
//         if (operation) {
//           stream.writeSSE({
//             data,
//             event,
//           });
//         }
//       }
//     } finally {
//       clearInterval(heartbeatInterval);
//     }
//   });
// });

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
  let messages: sync.Messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt));
  sync.broadcastNewMessage(chatId);

  return c.json({ msgId: await sync.newMessage(chatId, user.id, messages, opts) }, 201);
});

// app.get("/api/msg/:id", async (c) => {
//   const session = c.get("session");
//   const user = c.get("user");
//   const msgId = c.req.param("id");

//   if (!session || !user) {
//     return c.json({ error: "Unauthorized, you must log in to use this feature" }, 401);
//   }

//   const chatId = c.req.param("id");
//   if (!chatId || typeof chatId !== "string") {
//     return c.json({ error: "Invalid chat ID" }, 400);
//   }

//   return streamSSE(c, async (stream) => {
//     for await (const chunk in sync.msgSubscribe(msgId)) {
//       let chunkId = 0;
//       const message = sub;
//       await stream.writeSSE({
//         id: String(chunkId++),
//         data: message.reduce((prev, cur) => prev + cur.content, ""),
//         event: "message",
//       });
//       finish = sub.reduce((prev, cur) => prev || cur.finish_reason !== "", false);
//     }
//   });
// });

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
        sync.userEventWsHandler(chatId, ws);
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
          console.error(callParse.error);
          return;
        }
        const call = callParse.data;
        (async function () {
          switch (call.method) {
            case "subscribe":
              for await (const chunk of sync.msgSubscribe(call.params)) {
                ws.send(JSON.stringify({
                  jsonrpc: "2.0",
                  method: "chunk",
                  params: chunk,
                  id: call.params
                }))
              }
              break;
          }
        })();
      },
    };
  }),
);

export default {
  port: PORT,
  fetch: app.fetch,
  websocket,
};
