import { boolean, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import type z from "zod/v4";
import { user } from "./schema";

export type Theme = {
  base: "white" | "latte" | "frappe" | "macchiato" | "mocha" | "dark" | "system";
  color:
    | "rosewater"
    | "flamingo"
    | "pink"
    | "mauve"
    | "red"
    | "maroon"
    | "peach"
    | "yellow"
    | "green"
    | "teal"
    | "sky"
    | "sapphire"
    | "blue"
    | "lavender";
};

export const user_settings = pgTable("user_settings", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  name: text("name"),
  self_attr: text("self_attr"),
  traits: text("traits"),
  api_keys: text("api_keys").array(),

  theme: json().$type<Theme & { sync: boolean }>(),

  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .$onUpdateFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const UserSettingsUpdate = createUpdateSchema(user_settings);
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdate>;

export const settings_enum = pgEnum("system_setting", ["setting"]);
export const system_settings = pgTable("system_settings", {
  key: settings_enum().primaryKey().unique().notNull().default("setting"),

  theme: json().$type<Theme>().default({ base: "mocha", color: "sapphire" }).notNull(),
  allow_new_signups: boolean().default(false).notNull(),
});

export const SystemSettingsSelect = createSelectSchema(system_settings);
export type SystemSettingsSelect = z.infer<typeof SystemSettingsSelect>;

export const SystemSettingsUpdate = createUpdateSchema(system_settings);
export type SystemSettingsUpdate = z.infer<typeof SystemSettingsUpdate>;

export const roles = pgTable("roles", {
  id: text("id").primaryKey().unique().notNull(),
  name: text("name").notNull(),

  color: text("color"),

  allow_local_keys: boolean().default(true).notNull(),
  allow_byok: boolean().default(false).notNull(),
  allow_custom_providers: boolean().default(false).notNull(),
  is_admin: boolean().default(false).notNull(),

  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .$onUpdateFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});
