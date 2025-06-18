import { z } from "zod/v4-mini"; // framer took up all my space bruh :(

export const Chat = z.object({
  id: z.uuidv4(),
  title: z.string(),
  lastUpdated: z.coerce.date(),
});
export const Chats = z.array(Chat);
export type Chat = z.infer<typeof Chat>;
export const Message = z.object({
  id: z.uuidv4(),
  role: z.enum(["system", "user", "assistant"]),
  senderId: z.string(),
  chatId: z.string(),
  files: z.nullable(z.array(z.string())),
  reasoning: z.nullable(z.string()),
  message: z.string(),
  finish_reason: z.nullable(z.string()),
  createdAt: z.coerce.date(),
});
export type Message = z.infer<typeof Message>;
