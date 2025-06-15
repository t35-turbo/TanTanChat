import { OpenAI } from "openai";
import { z } from "zod/v4";
import { db } from "./db";
import { chatMessages, chats } from "./db/schema";
import { eq } from "drizzle-orm";
import * as vk from "./db/redis";
import { WSContext } from "hono/ws";
import { ServerWebSocket } from "bun";
import Exa from "exa-js"

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
        reasoning: z.string(),
        tool_calls: z.any(),
      }),
    })
    .array(),
});

const vk_client = vk.createClient();
const MAX_ITERATIONS = 10; // Maximum number of LLM-tool-LLM iterations

const exa = new Exa(process.env.EXASEARCH_API_KEY || "");

export async function callTestTool(params: string) {
  let sampleReturn = "Test tool called! Was successful!";
  return sampleReturn;
}

export async function searchWeb(query: string) {

  const result = await exa.searchAndContents(
    query,
    {
      text: true,
      numResults: 3
    });
  console.log("Search result:", result);
  return "search_result: "+JSON.stringify(result);
}

export async function newMessage(chatId: string, senderId: string, messages: Messages, opts: Options) {
  let uuid = crypto.randomUUID();

  newCompletion(uuid, chatId, messages, opts);
  pgSubscriber(uuid, chatId, "assistant", opts.model);

  return uuid;
}

async function newCompletion(id: string, chatId: string, messages: Messages, opts: Options, iters: number = 0) {
  if (!vk_client.isOpen) await vk_client.connect();

  let accumulatedContent = "";

  try {
    await vk_client.set(`chat:${chatId}:activeMessage`, id);
    await vk_client.publish(`chat:${chatId}:events`, `activeMessage ${id}`);

    const oai_client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: opts.apiKey,
      defaultHeaders: {
        "X-Title": "TanTan Chat"
      }
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

    // Original stream is complete. Now check for tool call
    if (accumulatedContent.includes("<WEB_SEARCH_TOOL>") && accumulatedContent.includes("</WEB_SEARCH_TOOL>")) {

      const toolCallStartTag = "<WEB_SEARCH_TOOL>";
      const toolCallEndTag = "</WEB_SEARCH_TOOL>";
      const toolCallStartIndex = accumulatedContent.indexOf(toolCallStartTag) + toolCallStartTag.length;
      const toolCallEndIndex = accumulatedContent.indexOf(toolCallEndTag);
      
      const queryForSearch = accumulatedContent.substring(toolCallStartIndex, toolCallEndIndex);
      
      const rawToolResponse = await searchWeb(queryForSearch);
      const toolResponse = rawToolResponse;
      const toolResponseId = crypto.randomUUID();

      await vk_client.set(`chat:${chatId}:activeMessage`, toolResponseId);
      await vk_client.publish(`chat:${chatId}:events`, `activeMessage ${toolResponseId}`);

      await vk_client.xAdd(`msg:${toolResponseId}`, "*", {
        finish_reason: "tool_response",
        reasoning: "",
        content: toolResponse,
        refusal: "",
        tool_calls: null + "", // No further tool calls from this tool's direct response
      });

      // pgSubscriber needs to be called for this new tool response
      pgSubscriber(toolResponseId, chatId, "assistant_tool_response", opts.model);

      // Call LLM again with tool output until max iters
      if (iters < MAX_ITERATIONS) {
        const nextMessagesForLLM: Messages = [
          ...messages, // Original messages history
          {
            id: id,
            role: "assistant",
            chatId: chatId,
            senderId: "assistant",
            message: accumulatedContent,
            createdAt: new Date(),
          },
          { // The tool's output
            id: toolResponseId,
            role: "assistant",
            chatId: chatId,
            senderId: "assistant_tool_response",
            message: toolResponse,
            createdAt: new Date(),
          }
        ];

        const finalResponseId = crypto.randomUUID();
        newCompletion(finalResponseId, chatId, nextMessagesForLLM, opts, iters + 1);
        pgSubscriber(finalResponseId, chatId, "assistant_final_response", opts.model);
      } else {
        console.log(`Max iterations (${MAX_ITERATIONS}) reached for chatId: ${chatId}. Halting further LLM calls.`);
      }
    }

  } catch (err: unknown) {
    // Log error to the original message stream
    await vk_client.xAdd(`msg:${id}`, "*", {
      finish_reason: (err as Error).message,
      content: "",
      reasoning: "",
      refusal: "",
      tool_calls: null + "",
    });
  } finally {
    // The activeMessage was initially set to `id`.
    // If a tool call occurred, it was then set to `toolResponseId`.
    // In either case, by this point, the generation process that this `newCompletion` call
    // was responsible for (either the main message or the subsequent tool message) is done.
    // Clearing `chat:${chatId}:activeMessage` signals no more *new* messages are imminently expected from this flow.
    await vk_client.del(`chat:${chatId}:activeMessage`);
    // Optionally, publish an event to explicitly clear the active message on the client side.
    // await vk_client.publish(`chat:${chatId}:events`, `activeMessage `);
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
      "X-Title": "TanTan Chat"
    }
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

async function pgSubscriber(id: string, chatId: string, senderId: string, model: string) {
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

    console.log("message", message);
    console.log("reasoning", reasoning);
    console.log("finish_reason", finish_reason);

    await db.insert(chatMessages).values({
      id,
      chatId,
      senderId, // Ensure senderId is passed correctly
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
