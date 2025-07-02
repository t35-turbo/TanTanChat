import { OpenAI } from "openai";
import { z } from "zod/v4";
import { db } from "./db";
import { chatMessages, chats } from "./db/schema";
import { eq, and, inArray } from "drizzle-orm";
import * as vk from "./db/redis";
import { WSContext } from "hono/ws";
import { BunFile, ServerWebSocket } from "bun";
import { default_prompt } from "./lib/sys_prompts";
import { debugLogger, devLog } from "./tools/debugLogger";
import { tools, TOOL_MAPPING } from "./tools";

export type Messages = {
  id: string;
  role: "user" | "system" | "assistant" | "tool";
  chatId: string;
  senderId: string;
  message: string;
  createdAt: Date;
  toolCallId?: string;
  tool_calls?: any[];
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

export async function newMessage(chatId: string, messages: Messages, opts: Options, depth?: number) {
  let uuid = crypto.randomUUID();

  newCompletion(uuid, chatId, messages, opts, depth ?? 0);
  pgSubscriber(uuid, chatId, opts.model);

  return uuid;
}

async function newCompletion(id: string, chatId: string, messages: Messages, opts: Options, depth: number) {
  if (!vk_client.isOpen) await vk_client.connect();

  if (depth > parseInt(process.env.MAX_TOOL_RECURSION_DEPTH || "10")) {
    debugLogger(['development', 'production'], `[WARN] Max tool recursion depth exceeded: ${depth}`);
  }

  let accumulatedContent = "";
  // Add accumulator for tool calls
  let accumulatedToolCalls: any[] = [];

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
    // Use Buffer for base64 encoding to handle large files
    const buffer = Buffer.from(arrayBuffer);
    if (file.metadata.mime === "application/pdf") {
      const base64 = buffer.toString("base64");
      const url = `data:${file.metadata.mime};base64,${base64}`;
      return {
        type: "file" as const,
        file: {
          filename: file.metadata.filename,
          file_data: url,
        },
      };
    } else if (file.metadata.mime.includes("image")) {
      const base64 = buffer.toString("base64");
      const url = `data:${file.metadata.mime};base64,${base64}`;
      return {
        type: "image_url" as const,
        image_url: {
          url,
        },
      };
    } else if (file.metadata.mime.includes("text")) {
      const str = buffer.toString();
      return {
        type: "text" as const,
        text: `person uploaded a file.\n<filename>\n${file.metadata.filename}\n</filename>\n<file_contents type="${file.metadata.mime}">\n${str}\n</file_contents>\n`,
      };
    }
    return undefined;
  };

  try {
    const msgs = [
      {
        role: "system" as const,
        content: default_prompt(opts.model.split("/")[0], opts.model.split("/")[0], depth) + "\n" + opts.system_prompt,
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
          } else if (m.role === "tool") {
            return {
              role: "tool" as const,
              content: m.message,
              tool_call_id: m.toolCallId || "",
            };
          } else if (m.role === "assistant") {
            // Only include tool_calls if it exists and has content
            const hasToolCalls = m.tool_calls && Array.isArray(m.tool_calls) && m.tool_calls.length > 0;

            const assistantMessage: any = {
              role: "assistant" as const,
              content: m.message || null, // content can be null when tool_calls are present
            };

            // Only add tool_calls property if it has actual content
            if (hasToolCalls) {
              // Convert arguments from object to JSON string for OpenAI
              assistantMessage.tool_calls = m.tool_calls!.map(call => ({
                ...call,
                function: {
                  ...call.function,
                  arguments: typeof call.function.arguments === 'string'
                    ? call.function.arguments
                    : JSON.stringify(call.function.arguments)
                }
              }));
            }

            return assistantMessage;
          } else { // For "system" or any other role
            return {
              role: m.role as "system",
              content: m.message,
            };
          }
        }),
      )),
    ];

    devLog("[Debug] Messages to OpenAI:", msgs);

    const stream = await oai_client.chat.completions.create({
      model: opts.model,
      tools,
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
      const toolCallsChunk = choice.delta?.tool_calls || [];

      accumulatedContent += contentChunk;
      if (toolCallsChunk.length > 0) {
        for (const toolCallChunk of toolCallsChunk) {
          const index = toolCallChunk.index;

          // Initialize if this is the first chunk for this tool call
          if (!accumulatedToolCalls[index]) {
            accumulatedToolCalls[index] = {
              id: toolCallChunk.id || "",
              type: toolCallChunk.type || "function",
              function: {
                name: toolCallChunk.function?.name || "",
                arguments: toolCallChunk.function?.arguments || ""
              }
            };
          } else {
            if (toolCallChunk.function?.arguments) {
              accumulatedToolCalls[index].function.arguments += toolCallChunk.function.arguments;
            }
          }
        }
      }

      await vk_client.xAdd(`msg:${id}`, "*", {
        finish_reason: choice.finish_reason || "",
        reasoning: (choice.delta as any).reasoning || "",
        content: contentChunk,
        refusal: choice.delta?.refusal || "",
        tool_calls: JSON.stringify(accumulatedToolCalls || []),
      });

      if (choice.finish_reason && choice.finish_reason === "tool_calls") {
        // devLog("[Debug] Tool calls detected, processing...");
        devLog("[Debug] Tool calls: ", accumulatedToolCalls);
        for (const toolCall of accumulatedToolCalls) {
          // devLog("[Debug] Processing tool call:", toolCall);

          if (toolCall.function.name in TOOL_MAPPING) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              let result;
              switch (toolCall.function.name) {
                case 'searchGutenbergBooks':
                  result = await TOOL_MAPPING.searchGutenbergBooks(args.search_terms);
                  break;
                case 'testSearch':
                  result = await TOOL_MAPPING.testSearch();
                  break;
                case 'searchWeb':
                  result = await TOOL_MAPPING.searchWeb(
                    args.query,
                    args.numResults,
                    args.links,
                    args.includeSubpages,
                    args.fullPageText,
                    args.imageLinks,
                    args.summary
                  );
                  devLog("[Debug] Search Web Result:", result);
                  break;
                default:
                  throw new Error(`Unknown tool function: ${toolCall.function.name}`);
              }
              // devLog("[Debug] Tool call result:", result);

              //add to db
              await db.insert(chatMessages).values({
                id: crypto.randomUUID(),
                chatId,
                senderId: "tool_response", // Ensure senderId is passed correctly
                role: "tool",
                message: JSON.stringify(result) || "", // Ensure message is never undefined/null
                toolCallId: toolCall.id,
                reasoning: "",
                tool_calls: [],
                finish_reason: "tool_calls_response",
                createdAt: new Date(),
              });

            } catch (error) {
              devLog("[Error] Tool call failed:", error);
            }
          }
        }

        // After processing, we make another call to continue the conversation

        // First, fetch the tool response messages from the database
        const toolCallIds = accumulatedToolCalls.map(tc => tc.id);
        const recentToolMessages = await db
          .select()
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.chatId, chatId),
              eq(chatMessages.role, "tool"),
              inArray(chatMessages.toolCallId, toolCallIds)
            )
          )
          .orderBy(chatMessages.createdAt)
          .then(results => results.map(msg => ({
            id: msg.id,
            role: "tool" as const,
            chatId: msg.chatId,
            senderId: msg.senderId,
            message: msg.message,
            createdAt: msg.createdAt,
            files: [],
            toolCallId: msg.toolCallId ?? undefined
          })));

        const newMessages = [
          ...messages,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            chatId,
            senderId: opts.model,
            message: accumulatedContent,
            createdAt: new Date(),
            files: [],
            tool_calls: accumulatedToolCalls.map(call => ({
              ...call,
              function: {
                ...call.function,
                arguments: JSON.stringify(call.function.arguments) // Convert to JSON string for OAI
              }
            })),
          },
          ...recentToolMessages,
        ];

        // devLog("[Debug] Continuing conversation with new messages:", newMessages);
        // await newCompletion(id, chatId, newMessages, opts);
        await newMessage(chatId, newMessages, opts, depth + 1);
      }
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
    let tool_calls: any[] = [];
    for await (const chunk of msgSubscribe(id)) {
      message += chunk.content;
      reasoning += chunk.reasoning;
      finish_reason = chunk.finish_reason;
      if (chunk.tool_calls) {
        try {
          const chunkToolCalls = JSON.parse(chunk.tool_calls);
          if (Array.isArray(chunkToolCalls) && chunkToolCalls.length > 0) {
            tool_calls = chunkToolCalls;
          }
        } catch (error) {
          devLog("[Error] Failed to parse tool calls:", error);
        }
      }
    }
    devLog("[Debug] Tool_calls (pgSubscriber):", tool_calls);
    // get type of tool_calls
    devLog("[Debug] Tool_calls type:", typeof tool_calls);

    // for some reason the tool call is not a real JSON object, so we need to parse it
    let parsedToolCalls: any[] = [];
    try {
      parsedToolCalls = tool_calls.map(call => ({
        ...call,
        function: {
          ...call.function,
          arguments: typeof call.function.arguments === 'string'
            ? JSON.parse(call.function.arguments)
            : call.function.arguments,
        },
      }));
    } catch (error) {
      debugLogger(['development', 'production'], "[Error] Failed to parse tool call arguments:", error);
    }

    await db.insert(chatMessages).values({
      id,
      chatId,
      senderId: model, // Ensure senderId is passed correctly
      role: "assistant",
      message,
      reasoning,
      tool_calls: parsedToolCalls,
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

export async function invalidateCache(userId: string, key: string) {
  vk_client.publish(`user:${userId}:events`, `invalidate ${key}`);
}