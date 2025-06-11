import { OpenAI } from "openai";
import * as vk from "./db/redis";
import { createClient } from "redis";
import { z } from "zod/v4";
import { db } from "./db";
import { chatMessages } from "./db/schema";

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

  newCompletion(uuid, messages, opts);
  pgSubscriber(uuid, chatId, senderId);

  return uuid;
}

export async function subscribe(id: string) {
  const vk_client = createClient();
  await vk_client.connect();

  let curKey = "0-0";
  return {
    next: async () => {
      let results = await vk_client.xRead({ key: `chat:${id}`, id: curKey }, { BLOCK: 0 });

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

async function newCompletion(id: string, messages: Messages, opts: Options) {
  const vk_client = createClient();
  await vk_client.connect();

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

    await vk_client.xAdd(`chat:${id}`, "*", {
      finish_reason: choice.finish_reason || "",
      content: choice.delta?.content || "",
      refusal: choice.delta?.refusal || "",
      tool_calls: JSON.stringify(choice.delta?.tool_calls || null),
    });
  }

  vk_client.destroy();
}

async function pgSubscriber(id: string, chatId: string, senderId: string) {
  const msgStream = await subscribe(id);
  let message = "";
  let finish = false;
  for (let sub = await msgStream.next(); !finish; sub = await msgStream.next()) {
    message += sub.reduce((prev, cur) => (prev + cur.content), "");
    finish = sub.reduce((prev, cur) => prev || cur.finish_reason !== "", false);
  }

  db.insert(chatMessages).values({
    id,
    chatId,
    senderId,
    role: "user",
    message,
    createdAt: new Date()
  });
}
