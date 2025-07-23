import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { user } from "./schema";
import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod/v4";
import { pgEnum } from "drizzle-orm/pg-core";

export const user_settings = pgTable("user_settings", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name"),
  self_attr: text("self_attr"),
  traits: text("traits"),
  api_keys: text("api_keys").array(),
  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const settings_enum = pgEnum("system_setting", ["setting"])
export const system_settings = pgTable("system_settings", {
  key: settings_enum().primaryKey().unique().notNull().default("setting"),
  allow_new_signups: boolean().default(false).notNull(),
});

export const SystemSettingsSelect = createSelectSchema(system_settings);
export type SystemSettingsSelect = z.infer<typeof SystemSettingsSelect>;

export const SystemSettingsUpdate = createUpdateSchema(system_settings);
export type SystemSettingsUpdate = z.infer<typeof SystemSettingsUpdate>;

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),

  allow_local_keys: boolean().default(true),
  allow_byok: boolean().default(false),
  allow_custom_providers: boolean().default(true),
  is_admin: boolean().default(false),

  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});
