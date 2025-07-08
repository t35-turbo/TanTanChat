import { z } from "zod/v4-mini"; // framer took up all my space bruh :(

export const Chat = z.object({
  id: z.uuidv4(),
  title: z.string(),
  lastUpdated: z.coerce.date(),
});
export const Chats = z.array(Chat);
export type Chat = z.infer<typeof Chat>;

export const allowedRoles = ["system", "user", "assistant", "tool"] as const;
export const Message = z.object({
  id: z.uuidv4(),
  role: z.enum(allowedRoles),
  senderId: z.string(),
  chatId: z.string(),
  files: z.nullable(z.array(z.string())),
  reasoning: z.nullable(z.string()),
  message: z.string(),
  finish_reason: z.nullable(z.string()),
  createdAt: z.coerce.date(),
  tool_calls: z.nullable(z.array(z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      arguments: z.record(z.string(), z.unknown()),
    }),
  }))),
  toolCallId: z.nullable(z.string())
});
export type Message = z.infer<typeof Message>;
