import { Hono } from "hono";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chatMessages, sharedChats, sharedChatMessages } from "./db/schema";
import { eq, desc, and, asc, gte, inArray } from "drizzle-orm";
import * as sync from "./sync";
import { z } from "zod";
import * as crypto from "crypto";
import { getFile } from "./files";
import { read } from "fs";

const chatsApp = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// get all chat threads
chatsApp.get("/", async (c) => {
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

type Message = {
  id: string;
  chatId: string;
  senderId: string;
  role: "user" | "system" | "assistant";
  message: string;
  files: string[];
  createdAt: Date;
};

// make new chat thread
chatsApp.post("/new", async (c) => {
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

async function getChatMessages(chatId: string): Promise<sync.Messages> {
  let msgs = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt));
  let completions: sync.Messages = [];
  for (const msg of msgs) {
    if (msg.files && msg.files.length > 0) {
      let files = await Promise.all(msg.files.map((file) => getFile(file)));
      completions.push({
        ...msg,
        files: files.filter((file) => !!file),
      });
    } else {
      completions.push({ ...msg, files: [] });
    }
  }


  return completions;
}

async function checkChatExists(chatId: string, userId: string) {
  return !!(
    await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
  )?.[0];
}

chatsApp.get("/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  let chatId = c.req.param("id");

  // Get query parameters from URL
  const CHUNK_RANGE = 100;
  const cursor = parseInt(c.req.query("cursor") ?? "0");
  const descending = c.req.query("descending") === "true";

  const isSharedChat = !!(await db.query.sharedChats.findFirst({
    where: and(
      eq(sharedChats.id, chatId),
      eq(sharedChats.everyoneCanUpdate, false),
      eq(sharedChats.followsUpdatesFromOriginal, true)
    ),
  }));

  console.log("Client requested chat: ", chatId, "which is shared:", isSharedChat);

  if (isSharedChat) {
    // If it's a shared chat, we need to get the chatId from the sharedChats table
    const sharedChat = await db.query.sharedChats.findFirst({
      where: eq(sharedChats.id, chatId),
      columns: { chatId: true },
    });
    if (sharedChat) {
      chatId = sharedChat.chatId;
    } else {
      return c.json({ error: "Shared chat not found" }, 404);
    }
  }


  if ((!session || !user) && !isSharedChat) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId || typeof chatId !== "string") {
    return c.json({ error: "Invalid chat ID" }, 400);
  }

  if (!isSharedChat && (!user || !(await checkChatExists(chatId, user.id)))) {
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

chatsApp.delete("/:id", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId) {
    return c.json({ error: "Chat ID is required" }, 400);
  }

  if (!(await checkChatExists(chatId, user.id))) {
    return c.json({ error: "Chat not found" }, 404);
  }

  // Delete the chat
  await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, user.id)));

  return c.json({ message: "Chat deleted successfully" }, 200);
});

chatsApp.put("/:id/rename", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const { name } = await c.req.json();
  const chatId = c.req.param("id");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!chatId) {
    return c.json({ error: "Invalid chat ID" }, 400);
  }
  if (!name || typeof name !== "string") {
    return c.json({ error: "Invalid Name" }, 400);
  }
  if (!(await checkChatExists(chatId, user.id))) {
    return c.json({ error: "Not Found" }, 404);
  }

  await db
    .update(chats)
    .set({ title: name })
    .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)));

  return c.json({}, 200);
});

chatsApp.post("/:id/new", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const { message, opts, files } = await c.req.json();
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
  if (!(await checkChatExists(chatId, user.id))) {
    return c.json({ error: "Not Found" }, 404);
  }
  if (await sync.getActiveMessage(chatId)) {
    return c.json({ error: "Chat is Busy" }, 409);
  }

  const newMessage: Message = {
    id: crypto.randomUUID(),
    chatId: chatId,
    senderId: user.id,
    role: "user",
    message: message,
    files: files ?? [],
    createdAt: new Date(),
  };
  console.log("Creating new message for chat:", chatId, "with message:", message);
  await db.insert(chatMessages).values(newMessage);
  let messages: sync.Messages = await getChatMessages(chatId);
  sync.broadcastNewMessage(chatId);

  return c.json({ msgId: await sync.newMessage(chatId, messages, opts) }, 201);
});

chatsApp.delete("/:id/file", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");
  const msgId = c.req.query("msgId");
  const fileId = c.req.query("fileId");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId || !msgId || !fileId) {
    return c.json({ error: "Bad Request" }, 400);
  }

  if (!(await checkChatExists(chatId, user.id))) {
    return c.json({ error: "Not Found" }, 404);
  }

  // Get the message to check if it exists and belongs to this chat
  const message = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.id, msgId), eq(chatMessages.chatId, chatId)))
    .limit(1);

  if (!message[0]) {
    return c.json({ error: "Message not found" }, 404);
  }

  // Remove the file from the files array
  const currentFiles = message[0].files || [];
  const updatedFiles = currentFiles.filter(file => file !== fileId);

  // Update the message with the new files array
  await db
    .update(chatMessages)
    .set({ files: updatedFiles })
    .where(eq(chatMessages.id, msgId));

  return c.json({ message: "File removed successfully" }, 200);
});

chatsApp.post("/:id/retry", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const { message, opts } = await c.req.json();
  const chatId = c.req.param("id");
  const msgId = c.req.query("msgId");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!chatId || !msgId) {
    return c.json({ error: "Chat ID and Message ID are required" }, 400);
  }

  if (!(await checkChatExists(chatId, user.id))) {
    return c.json({ error: "Not Found" }, 404);
  }

  const newMsgs = (await getChatMessages(chatId)).reduce(
    (prev: { arr: sync.Messages; delArr: string[]; flag: boolean }, cur: sync.Messages[number]) => {
      if (prev.flag) {
        return { ...prev, delArr: [...prev.delArr, cur.id] };
      } else if (cur.id === msgId) {
        if (cur.role === "user") {
          let userMsg = cur;
          if (message && typeof message === "string") {
            userMsg.message = message;
          }
          return { arr: [...prev.arr, userMsg], delArr: [], flag: true };
        } else {
          return { arr: prev.arr, delArr: [cur.id], flag: true };
        }
      } else {
        return { arr: [...prev.arr, cur], delArr: [], flag: false };
      }
    },
    { arr: [], delArr: [], flag: false },
  );

  if (await sync.getActiveMessage(chatId)) {
    return c.json({ error: "Chat is Busy" }, 409);
  }

  // Delete messages after the specified message
  const operations = [];

  if (newMsgs.delArr.length > 0) {
    operations.push(db.delete(chatMessages).where(inArray(chatMessages.id, newMsgs.delArr)));
  }

  if (message) {
    operations.push(db.update(chatMessages).set({ message }).where(eq(chatMessages.id, msgId)));
  }

  await Promise.all(operations);

  let messages: sync.Messages = newMsgs.arr;
  return c.json({ msgId: await sync.newMessage(chatId, messages, opts) }, 201);
});

chatsApp.post("/:id/share/existingChat", async (c) => {
  const session = c.get("session");
  const user = c.get("user");
  const chatId = c.req.param("id");
  const everyoneCanUpdate = c.req.query("everyoneCanUpdate") === "true";
  const readOnly = c.req.query("readOnly") === "true";
  const followsUpdatesFromOriginal = c.req.query("followsUpdatesFromOriginal") === "true";
  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!chatId || typeof chatId !== "string") {
    return c.json({ error: "Invalid chat ID" }, 400);
  }
  // if (!(await checkChatExists(chatId, user.id))) {
  //   return c.json({ error: "Not Found" }, 404);
  // }

  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
    .limit(1);
  if (!chat[0]) {
    return c.json({ error: "Chat not found or you are not the owner" }, 404);
  }

  // Clone the chat byy copying the chat and its messages
  const newChat = {
    id: crypto.randomUUID(),
    userId: user.id,
    chatId: chatId,
    title: "(Shared) " + chat[0].title,
    lastUpdated: new Date(),
    followsUpdatesFromOriginal: followsUpdatesFromOriginal,
    everyoneCanUpdate: everyoneCanUpdate,
    readOnly: readOnly,
  };

  await db.insert(sharedChats).values(newChat);

  if (followsUpdatesFromOriginal) {
    // if the shared chat follows updates from the original no need to copy messages
    return c.json({ chatId: newChat.id }, 201);
  }
  // If it doesn't follow updates, we need to copy the messages

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(asc(chatMessages.createdAt));

  const sharedMessages = messages.map((msg) => ({
    id: crypto.randomUUID(),
    chatId: newChat.id,
    senderId: msg.senderId,
    role: msg.role,
    message: msg.message,
    files: msg.files || [],
    reasoning: msg.reasoning,
    finish_reason: msg.finish_reason,
    createdAt: msg.createdAt,
  }));
  await db.insert(sharedChatMessages).values(sharedMessages);
  // sync.broadcastNewSharedChat(newChat.id, newChat.title, user.id);
  return c.json({ chatId: newChat.id }, 201);
});

export default chatsApp;
