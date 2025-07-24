import { Hono } from "hono";
import { auth } from "./lib/auth";
import { db } from "./db";
import { chats, chat_messages } from "./db/schema";
import { eq, desc, and, asc, gte, inArray } from "drizzle-orm";
import * as sync from "./sync";
import { z } from "zod/v4";
import * as crypto from "crypto";
import { getFile } from "./files";
import { authProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";

type Message = {
  id: string;
  chatId: string;
  senderId: string;
  role: "user" | "system" | "assistant";
  message: string;
  files: string[];
  createdAt: Date;
};

const chatProcedure = authProcedure.input(z.object({ chatId: z.string() })).use(async (opts) => {
  if (await checkChatExists(opts.input.chatId, opts.ctx.user.id)) {
    return opts.next();
  } else {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The relevant Chat was not found.",
    });
  }
});

export const chatRouter = router({
  listThreads: authProcedure.query(async (opts) => {
    return await db.select().from(chats).where(eq(chats.userId, opts.ctx.user.id));
  }),
  newThread: authProcedure
    .input(
      z.object({
        message: z.string(),
        opts: z.object({ apiKey: z.string(), model: z.string() }),
      }),
    )
    .mutation(async (opts) => {
      const newChat = {
        id: crypto.randomUUID(),
        userId: opts.ctx.user.id,
        title: "New Chat",
      };

      sync.titleGenerator(newChat.id, opts.input.message, [opts.ctx.user.id], opts.input.opts);
      await db.insert(chats).values(newChat);

      return newChat.id;
    }),
  deleteThread: chatProcedure.mutation(async (opts) => {
    return (
      (
        await db
          .delete(chats)
          .where(and(eq(chats.id, opts.input.chatId), eq(chats.userId, opts.ctx.user.id)))
          .returning({ id: chats.id })
      ).length > 0
    );
  }),
  renameThread: chatProcedure.input(z.object({ name: z.string() })).mutation(async (opts) => {
    await db
      .update(chats)
      .set({ title: opts.input.name })
      .where(and(eq(chats.id, opts.input.chatId), eq(chats.userId, opts.ctx.user.id)));
  }),
  removeFile: chatProcedure.input(z.object({ msgId: z.string(), fileId: z.string() })).mutation(async (opts) => {
    // Get the message to check if it exists and belongs to this chat
    const message = await db
      .select()
      .from(chat_messages)
      .where(and(eq(chat_messages.id, opts.input.msgId), eq(chat_messages.chatId, opts.input.chatId)))
      .limit(1);

    if (!message[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Message not found",
      });
    }

    // Remove the file from the files array
    const currentFiles = message[0].files || [];
    const updatedFiles = currentFiles.filter((file) => file !== opts.input.fileId);

    // Update the message with the new files array
    await db.update(chat_messages).set({ files: updatedFiles }).where(eq(chat_messages.id, opts.input.msgId));

    return { message: "File removed successfully" };
  }),
  retryMessage: chatProcedure
    .input(
      z.object({
        msgId: z.string(),
        message: z.string().optional(),
        opts: z.object({
          apiKey: z.string(),
          model: z.string(),
          api_format: z.literal("openai"),
          baseUrl: z.literal("https://openrouter.ai/api/v1"),
          reasoning_effort: z.enum(["low", "medium", "high"]).optional(),
          system_prompt: z.string(),
        }),
      }),
    )
    .mutation(async (opts) => {
      // search for the message in the messages
      const allMessages = await getChatMessages(opts.input.chatId);
      const messageIndex = allMessages.findIndex((msg) => msg.id === opts.input.msgId);

      let newMsgs: { arr: sync.Messages; delArr: string[] };

      if (messageIndex === -1) {
        // message not found
        newMsgs = { arr: allMessages, delArr: [] };
      } else {
        const targetMessage = allMessages[messageIndex];
        if (targetMessage.role === "user") {
          // message to retry/edit is user message
          if (opts.input.message && typeof opts.input.message === "string") {
            targetMessage.message = opts.input.message;
          }
          newMsgs = {
            // keep all messages up to and including this one.
            arr: allMessages.slice(0, messageIndex + 1),
            delArr: allMessages.slice(messageIndex + 1).map((m) => m.id),
          };
        } else {
          // If the target is not a user message, we delete it and all subsequent messages.
          newMsgs = {
            arr: allMessages.slice(0, messageIndex),
            delArr: allMessages.slice(messageIndex).map((m) => m.id),
          };
        }
      }

      if (await sync.getActiveMessage(opts.input.chatId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Chat is Busy",
        });
      }

      // Delete messages after the specified message
      const operations = [];

      if (newMsgs.delArr.length > 0) {
        operations.push(db.delete(chat_messages).where(inArray(chat_messages.id, newMsgs.delArr)));
      }

      if (opts.input.message) {
        operations.push(
          db.update(chat_messages).set({ message: opts.input.message }).where(eq(chat_messages.id, opts.input.msgId)),
        );
      }

      await Promise.all(operations);
      sync.invalidateCache(opts.ctx.user.id, "messages");

      const messages: sync.Messages = newMsgs.arr;
      return { msgId: await sync.newMessage(opts.input.chatId, messages, opts.input.opts) };
    }),

  threadHistory: chatProcedure.query(async (opts) => {
    return await db
      .select()
      .from(chat_messages)
      .where(eq(chat_messages.chatId, opts.input.chatId))
      .orderBy(asc(chat_messages.createdAt));
  }),
  newMessage: chatProcedure
    .input(
      z.object({
        message: z.string(),
        opts: z.object({
          apiKey: z.string(),
          baseUrl: z.literal("https://openrouter.ai/api/v1"),
          api_format: z.literal("openai"),
          model: z.string(),
          system_prompt: z.string(),
          tools: z.null(),
        }),
        files: z.string().array(),
      }),
    )
    .mutation(async (opts) => {
      const chatId = opts.input.chatId;

      const newMessage: Message = {
        id: crypto.randomUUID(),
        chatId,
        senderId: opts.ctx.user.id,
        role: "user",
        message: opts.input.message,
        files: opts.input.files,
        createdAt: new Date(),
      };

      await db.insert(chat_messages).values(newMessage);
      let messages: sync.Messages = await getChatMessages(chatId);
      sync.broadcastNewMessage(chatId);

      return await sync.newMessage(chatId, messages, opts.input.opts);
    }),
});

async function getChatMessages(chatId: string): Promise<sync.Messages> {
  let msgs = await db
    .select()
    .from(chat_messages)
    .where(eq(chat_messages.chatId, chatId))
    .orderBy(asc(chat_messages.createdAt));
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

async function checkChatExists(chatId: string, userId: string): Promise<boolean> {
  return !!(
    await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
  )?.[0];
}
