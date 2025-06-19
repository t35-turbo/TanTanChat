import { pgTable, text, timestamp, boolean, index, pgEnum, integer } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";
import { int } from "drizzle-orm/mysql-core";
import { read } from "fs";
import { every } from "hono/combine";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()),
});

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  lastUpdated: timestamp("last_updated")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sharedChats = pgTable(
  "shared_chats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastUpdated: timestamp("last_updated")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    readOnly: boolean("read_only")
      .$defaultFn(() => false)
      .notNull(),
    everyoneCanUpdate: boolean("everyone_can_update")
      .$defaultFn(() => false)
      .notNull(),
    followsUpdatesFromOriginal: boolean("follows_updates_from_original")
      .$defaultFn(() => false)
      .notNull(),
});

export const sharedChatMessages = pgTable(`shared_chat_messages`, {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  role: text("role").notNull(),
  chatId: text("chat_id")
    .notNull()
    .references(() => sharedChats.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  message: text("content").notNull(),
  reasoning: text("reasoning"),
  finish_reason: text("finish_reason"),
  files: text("files").array(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (table) => ({
  chatIdCreatedAtIndex: index("idx_shared_messages_chat_id_created_at").on(table.chatId, desc(table.createdAt)),
}));

export const roleEnum = pgEnum("role", ["system", "assistant", "user"]);
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    role: roleEnum().notNull(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    senderId: text("sender_id").notNull(),
    message: text("content").notNull(),
    reasoning: text("reasoning"),
    finish_reason: text("finish_reason"),
    files: text("files").array(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    chatIdCreatedAtIndex: index("idx_messages_chat_id_created_at").on(table.chatId, desc(table.createdAt)),
  }),
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("idx_settings_user_id_key").on(table.userId, table.key)],
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("idx_system_settings_key").on(table.key)],
);

export const files = pgTable(
  "files",
  {
    "id": text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    "filename": text("filename").notNull(),
    "size": integer("size").notNull(),
    "hash": text("hash").notNull(),
    "mime": text("mime").notNull(),
    "ownedBy": text("owned_by").notNull().references(() => user.id, { onDelete: "cascade" }),
    "onS3": boolean("on_s3")
      .$defaultFn(() => false)
      .notNull(),
    "filePath": text("file_path").notNull(),
    "createdAt": timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),

  }
);
