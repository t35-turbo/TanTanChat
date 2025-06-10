import Dexie, { type EntityTable } from "dexie";
import { z } from "zod/v4-mini"; // framer took up all my space bruh :(

// TODO: UPDATE THIS WITH THE REAL CHAT SCHEMA
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
  message: z.string(),
  createdAt: z.coerce.date(),
});
export type Message = z.infer<typeof Message>;
export const IDBChat = z.intersection(
  Chat,
  z.object({
    messages: z.array(Message),
  }),
);
export type IDBChat = z.infer<typeof IDBChat>;

export const db = new Dexie("main") as Dexie & {
  chats: EntityTable<IDBChat, "id">;
};

db.version(1).stores({
  chats: "id, title, lastUpdated",
});
