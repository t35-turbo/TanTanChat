import { OpenAI } from "openai";
import { z } from "zod/v4";
import { db } from "./db";
import { chatMessages, chats } from "./db/schema";
import { eq } from "drizzle-orm";
import * as vk from "./db/redis";
import { WSContext } from "hono/ws";
import { BunFile, ServerWebSocket } from "bun";
import Exa from "exa-js";
import { default_prompt } from "./lib/sys_prompts";
import env from "./lib/env";

export type Messages = {
  id: string;
  role: "user" | "system" | "assistant";
  chatId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  files: {
    data: BunFile;
    metadata: {
      id: string;
      filename: string;
      size: number;
      hash: string;
      mime: string;
      ownedBy: string;
      onS3: boolean;
      filePath: string;
      createdAt: Date;
    };
  }[];
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
        reasoning: z.string(),
        tool_calls: z.any(),
      }),
    })
    .array(),
});

const vk_client = vk.createClient();

// export async function searchWeb(query: string) {
//   const exa = new Exa(env.EXASEARCH_API_KEY || "");
//   const result = await exa.searchAndContents(query, {
//     text: true,
//     numResults: 3,
//     context: true,
//     // summary: true,
//   });
//   return "search_result: " + JSON.stringify(result);
// }

export async function newMessage(chatId: string, messages: Messages, opts: Options) {
  let uuid = crypto.randomUUID();

  newCompletion(uuid, chatId, messages, opts);
  pgSubscriber(uuid, chatId, opts.model);

  return uuid;
}

async function newCompletion(id: string, chatId: string, messages: Messages, opts: Options) {
  if (!vk_client.isOpen) await vk_client.connect();

  let accumulatedContent = "";

  await vk_client.set(`chat:${chatId}:activeMessage`, id);
  await vk_client.publish(`chat:${chatId}:events`, `activeMessage ${id}`);

  const oai_client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: opts.apiKey,
    defaultHeaders: {
      "X-Title": "TanTan Chat",
    },
  });

  // Helper function to convert file to base64 data URL
  const fileMsgGenerator = async (file: {
    data: BunFile;
    metadata: {
      id: string;
      filename: string;
      size: number;
      hash: string;
      mime: string;
      ownedBy: string;
      onS3: boolean;
      filePath: string;
      createdAt: Date;
    };
  }): Promise<
    | { type: "image_url"; image_url: { url: string } }
    | { type: "text"; text: string }
    | { type: "file"; file: { filename: string; file_data: string } }
    | undefined
  > => {
    const arrayBuffer = await file.data.arrayBuffer();
    if (file.metadata.mime === "application/pdf") {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const url = `data:${file.metadata.mime};base64,${base64}`;
      return {
        type: "file" as const,
        file: {
          filename: file.metadata.filename,
          file_data: url,
        },
      };
    } else if (file.metadata.mime.includes("image")) {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const url = `data:${file.metadata.mime};base64,${base64}`;
      return {
        type: "image_url" as const,
        image_url: {
          url,
        },
      };
    } else if (file.metadata.mime.includes("text")) {
      const str = String.fromCharCode(...new Uint8Array(arrayBuffer));
      return {
        type: "text" as const,
        text: `person uploaded a file.
<filename>
${file.metadata.filename}
</filename>
<file_contents type="${file.metadata.mime}">
${str}
</file_contents>
`,
      };
    }
    return undefined;
  };

  try {
    const msgs = [
      {
        role: "system" as const,
        content: default_prompt(opts.model.split("/")[0], opts.model.split("/")[0]) + "\n" + opts.system_prompt,
      },
      ...(await Promise.all(
        messages.map(async (m) => {
          if (m.role === "user") {
            const fileContents =
              m.files && m.files.length > 0
                ? (await Promise.all(m.files.map(fileMsgGenerator))).filter(
                    (item): item is NonNullable<typeof item> => item !== undefined,
                  )
                : [];

            return {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: m.message,
                },
                ...fileContents,
              ],
            };
          } else {
            return {
              role: m.role as "system" | "assistant",
              content: m.message,
            };
          }
        }),
      )),
    ];
    const stream = await oai_client.chat.completions.create({
      model: opts.model,
      messages: msgs,
      reasoning_effort: opts.reasoning_effort,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    // Stream the original response
    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) {
        continue;
      }

      const contentChunk = choice.delta?.content || "";

      accumulatedContent += contentChunk;

      await vk_client.xAdd(`msg:${id}`, "*", {
        finish_reason: choice.finish_reason || "",
        reasoning: (choice.delta as any).reasoning || "",
        content: contentChunk,
        refusal: choice.delta?.refusal || "",
        tool_calls: JSON.stringify(choice.delta?.tool_calls || null),
      });
    }
  } catch (err: any) {
    await vk_client.xAdd(`msg:${id}`, "*", {
      finish_reason: err.message || err.statusCode || err.toString(),
      reasoning: "",
      content: "",
      refusal: "",
      tool_calls: JSON.stringify(null),
    });
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
    defaultHeaders: {
      "X-Title": "TanTan Chat",
    },
  });

  let completion = await oai_client.chat.completions.create({
    model: opts.model,
    messages: [
      {
        role: "system",
        content:
          "You are a title generator. The next message will be a user's query. You will generate a short title based on the query. Use only plain text without any markdown formatting.",
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
        if (message.finish_reason !== "") {
          yield message;
          return;
        } else {
          yield message;
        }
      }
    }
  }
}

async function pgSubscriber(id: string, chatId: string, model: string) {
  if (!vk_client.isOpen) await vk_client.connect();

  try {
    let message = "";
    let reasoning = "";
    let finish_reason = "";
    for await (const chunk of msgSubscribe(id)) {
      message += chunk.content;
      reasoning += chunk.reasoning;
      finish_reason = chunk.finish_reason;
    }

    await db.insert(chatMessages).values({
      id,
      chatId,
      senderId: model, // Ensure senderId is passed correctly
      role: "assistant",
      message,
      reasoning,
      finish_reason,
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
    if (ws.readyState == 1) {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "activeMessage",
          params: await vk_client.get(`chat:${chatId}:activeMessage`),
        }),
      );
    } else {
      return;
    }
  }

  vk_client.subscribe(`chat:${chatId}:events`, async (message) => {
    const splitIndex = message.indexOf(" ");
    const eventName = message.slice(0, splitIndex);
    const data = message.slice(splitIndex + 1);
    if (ws.readyState === 1) {
      if (message) {
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: eventName,
            params: data,
          }),
        );
      }
    } else if (ws.readyState !== 0) {
      await vk_client.unsubscribe(`chat:${chatId}:events`);
      vk_client.destroy();
    }
  });
}

export async function userEventWsHandler(userId: string, ws: WSContext<ServerWebSocket<undefined>>) {
  const vk_client = vk.createClient();
  if (!vk_client.isOpen) vk_client.connect();

  vk_client.subscribe(`user:${userId}:events`, (message) => {
    const splitIndex = message.indexOf(" ");
    const eventName = message.slice(0, splitIndex);
    const data = message.slice(splitIndex + 1);
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ jsonrpc: "2.0", method: eventName, params: data }));
    } else if (ws.readyState !== 0) {
      vk_client.unsubscribe(`user:${userId}:events`);
      vk_client.destroy();
    }
  });
}

export async function wsMessageSubscriber(msgId: string, ws: WSContext<ServerWebSocket<undefined>>) {
  try {
    for await (const chunk of msgSubscribe(msgId)) {
      if (ws.readyState === 1) {
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "chunk",
            params: chunk,
            id: msgId,
          }),
        );
      } else {
        break;
      }
    }
  } catch (error) {
    console.error("error", error);
  }
}
