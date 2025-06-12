import { OpenAI } from "openai";
import { z } from "zod/v4";
import { db } from "./db";
import { chatMessages, chats } from "./db/schema";
import { eq } from "drizzle-orm";
import * as vk from "./db/redis";
import { WSContext } from "hono/ws";
import { ServerWebSocket } from "bun";

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

const vk_client = vk.createClient();

export async function newMessage(chatId: string, senderId: string, messages: Messages, opts: Options) {
  let uuid = crypto.randomUUID();

  newCompletion(uuid, chatId, messages, opts);
  pgSubscriber(uuid, chatId, senderId);

  return uuid;
}

async function newCompletion(id: string, chatId: string, messages: Messages, opts: Options) {
  if (!vk_client.isOpen) await vk_client.connect();

  try {
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
  } finally {
    await vk_client.del(`chat:${chatId}:activeMessage`);
  }
}

export async function broadcastNewMessage(chatId: string) {
  if (!vk_client.isOpen) await vk_client.connect();
  return await vk_client.publish(`chat:${chatId}:events`, "invalidate messages");
}

export async function getActiveMessage(chatId: string) {
  if (!vk_client.isOpen) await vk_client.connect();
  return await vk_client.get(`chat:${chatId}:activeMessage`);
}

export async function titleGenerator(
  chatId: string,
  message: string,
  userId: string[],
  opts: { apiKey: string; model: string },
) {
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
    userId.forEach((user) => vk_client.publish(`user:${user}:events`, `invalidate chats`));
  }
}

export async function* msgSubscribe(msgId: string) {
  const sub_client = vk.createClient();
  await sub_client.connect();

  let curKey = "0-0";

  while (true) {
    let results = await sub_client.xRead({ key: `msg:${msgId}`, id: curKey }, { BLOCK: 0 });
    if (results && Array.isArray(results) && results[0]) {
      const result = RedisMessageResponse.parse(results[0]).messages;
      curKey = result[result.length - 1].id;

      for (const message of result.map((m) => m.message)) {
        yield message;
      }

      if (result.reduce((prev, cur) => prev || cur.message.finish_reason !== "", false)) {
        break;
      }
    }
  }
}

async function pgSubscriber(id: string, chatId: string, senderId: string) {
  if (!vk_client.isOpen) await vk_client.connect();

  try {
    let message = "";
    for await (const chunk of msgSubscribe(id)) {
      message += chunk.content;
    }

    await db.insert(chatMessages).values({
      id,
      chatId,
      senderId,
      role: "assistant",
      message,
      createdAt: new Date(),
    });
  } finally {
    await vk_client.del(`chat:${chatId}:activeMessage`);
    await vk_client.del(`msg:${id}`);
    await vk_client.publish(`chat:${chatId}:events`, "activeMessage ");
    await broadcastNewMessage(chatId);
  }
}

export async function chatEventWsHandler(chatId: string, ws: WSContext<ServerWebSocket<undefined>>) {
  const vk_client = vk.createClient();
  if (!vk_client.isOpen) await vk_client.connect();

  if ((await vk_client.exists(`chat:${chatId}:activeMessage`)) === 1) {
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "activeMessage",
        params: await vk_client.get(`chat:${chatId}:activeMessage`),
      }),
    );
  }

  vk_client.subscribe(`chat:${chatId}:events`, async (message) => {
    const splitIndex = message.indexOf(" ");
    const eventName = message.slice(0, splitIndex);
    const data = message.slice(splitIndex + 1);
    if (message) {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: eventName,
          params: data,
        }),
      );
    }
  });
}

export async function userEventWsHandler(chatId: string, ws: WSContext<ServerWebSocket<undefined>>) {
  const vk_client = vk.createClient();
  if (!vk_client.isOpen) vk_client.connect();

  vk_client.subscribe(`chat:${chatId}:events`, (message) => {
    const splitIndex = message.indexOf(" ");
    const eventName = message.slice(0, splitIndex);
    const data = message.slice(splitIndex + 1);
    ws.send(JSON.stringify({ jsonrpc: "2.0", method: eventName, params: data }));
  });
}
