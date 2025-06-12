import { OpenAI } from "openai";
import { createClient } from "redis";
import { z } from "zod/v4";
import { db } from "./db";
import { chatMessages, chats } from "./db/schema";
import { eq } from "drizzle-orm";
import * as vk from "./db/redis"

export type Messages = {
  id: string;
  role: "user" | "system" | "assistant";
  chatId: string;
  senderId: string;
  message: string;
  createdAt: Date;
}[];

export type Options = {
  apiKey: string;
  model: string;
  reasoning_effort?: "low" | "medium" | "high";
  system_prompt: string;
};

const RedisMessageResponse = z.object({
  name: z.string(),
  messages: z
    .object({
      id: z.string(),
      message: z.object({
        finish_reason: z.string(),
        content: z.string(),
        refusal: z.string(),
        tool_calls: z.any(),
      }),
    })
    .array(),
});

export async function newMessage(chatId: string, senderId: string, messages: Messages, opts: Options) {
  let uuid = crypto.randomUUID();

  newCompletion(uuid, chatId, messages, opts);
  pgSubscriber(uuid, chatId, senderId);

  return uuid;
}

export async function msgSubscribe(msgId: string) {
  const sub_client = vk.createClient();
  await sub_client.connect();

  let curKey = "0-0";
  return {
    next: async () => {
      let results = await sub_client.xRead({ key: `msg:${msgId}`, id: curKey }, { BLOCK: 0 });

      if (results && Array.isArray(results) && results[0]) {
        const result = RedisMessageResponse.parse(results[0]).messages;
        curKey = result[result.length - 1].id;

        return result.map((m) => m.message);
      } else {
        throw new Error("Invalid response from streamer");
      }
    },
  };
}

const vk_client = vk.createClient();
async function newCompletion(id: string, chatId: string, messages: Messages, opts: Options) {
  if (!vk_client.isOpen) await vk_client.connect();

  await vk_client.set(`chat:${chatId}:activeMessage`, id);
  await vk_client.publish(`chat:${chatId}:events`, `activeMessage ${id}`);

  const oai_client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: opts.apiKey,
  });

  const stream = await oai_client.chat.completions.create({
    model: opts.model,
    messages: [
      {
        role: "system",
        content: opts.system_prompt,
      },
      ...messages.map((m) => ({
        role: m.role,
        content: m.message,
      })),
    ],
    reasoning_effort: opts.reasoning_effort,
    stream: true,
  });

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (!choice) {
      continue;
    }

    await vk_client.xAdd(`msg:${id}`, "*", {
      finish_reason: choice.finish_reason || "",
      content: choice.delta?.content || "",
      refusal: choice.delta?.refusal || "",
      tool_calls: JSON.stringify(choice.delta?.tool_calls || null),
    });
  }
}

async function pgSubscriber(id: string, chatId: string, senderId: string) {
  if (!vk_client.isOpen) await vk_client.connect();
  const msgStream = await msgSubscribe(id);
  let message = "";
  let finish = false;
  for (let sub = await msgStream.next(); !finish; sub = await msgStream.next()) {
    message += sub.reduce((prev, cur) => prev + cur.content, "");
    finish = sub.reduce((prev, cur) => prev || cur.finish_reason !== "", false);
  }

  await db.insert(chatMessages).values({
    id,
    chatId,
    senderId,
    role: "assistant",
    message,
    createdAt: new Date(),
  });

  await vk_client.del(`chat:${chatId}:activeMessage`);
  await vk_client.del(`msg:${id}`);
  await vk_client.publish(`chat:${chatId}:events`, "activeMessage ");
  await broadcastNewMessage(chatId);
}

export async function titleGenerator(chatId: string, message: string, opts: { apiKey: string; model: string }) {
  const oai_client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: opts.apiKey,
  });

  let completion = await oai_client.chat.completions.create({
    model: opts.model,
    messages: [
      {
        role: "system",
        content:
          "You are a title generator. The next message will be a user's query. You will generate a short title based on the query.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  if (completion.choices[0].message.content) {
    await db.update(chats).set({ title: completion.choices[0].message.content }).where(eq(chats.id, chatId));
    if (!vk_client.isOpen) await vk_client.connect();
    vk_client.publish(`chat:${chatId}:events`, `invalidate chats`)
  }
}

export async function getActiveMessage(chatId: string) {
  if (!vk_client.isOpen) await vk_client.connect();
  return await vk_client.get(`chat:${chatId}:activeMessage`);
}

export async function broadcastNewMessage(chatId: string) {
  if (!vk_client.isOpen) await vk_client.connect();
  return await vk_client.publish(`chat:${chatId}:events`, "invalidate messages");
}

export async function* createChatEventSubscriber(chatId: string) {
  const vk_client = vk.createClient();
  if (!vk_client.isOpen) vk_client.connect();

  if ((await vk_client.exists(`chat:${chatId}:activeMessage`)) === 1) {
    yield `activeMessage ${await vk_client.get(`chat:${chatId}:activeMessage`)}`;
  }

  // Create a queue to store incoming messages
  const messageQueue: string[] = [];
  let resolveNext: ((value: IteratorResult<string>) => void) | null = null;
  let isSubscribed = true;

  // Subscribe to the Redis channel
  vk_client.subscribe(`chat:${chatId}:events`, (message) => {
    if (!isSubscribed) return;

    if (resolveNext) {
      resolveNext({ value: message, done: false });
      resolveNext = null;
    } else {
      messageQueue.push(message);
    }
  });

  try {
    // Generator loop
    while (isSubscribed) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        yield (await new Promise<IteratorResult<string>>((resolve) => {
          resolveNext = resolve;
        })).value;
      }
    }
  } finally {
    isSubscribed = false;
    await vk_client.unsubscribe(`chat:${chatId}:events`);
    if (!vk_client.isClosed) vk_client.destroy();
  }
}
