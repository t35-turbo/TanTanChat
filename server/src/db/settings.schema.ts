import { boolean, json, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import type z from "zod/v4";
import { generateId } from "../utils/id.ts";
import { user } from "./schema.ts";

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

export const email_provider_enum = pgEnum("email_provider", ["none"]);
export const settings_enum = pgEnum("system_setting", ["setting"]);
export const system_settings = pgTable("system_settings", {
  key: settings_enum().primaryKey().unique().notNull().default("setting"),

  theme: json().$type<Theme>().default({ base: "mocha", color: "sapphire" }).notNull(),
  allow_new_signups: boolean().default(false).notNull(),
  email_provider: email_provider_enum().default("none").notNull(),
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

const RolesInsert = createInsertSchema(roles);
export type RolesInsert = z.infer<typeof RolesInsert>;

/**
 * Enum for the scope of an API key.
 * - global: The key has access to all resources.
 * - role: The key has access to resources for a specific role.
 * - user: The key has access to resources for a specific user.
 */
export const api_key_scope_enum = pgEnum("api_key_scope", ["global", "role", "user"]);
export const api_keys = pgTable("api_keys", {
  /**
   * Unique identifier for the API key
   */
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  /**
   * Whether the API key is currently enabled
   */
  enabled: boolean("enabled").notNull().default(true),
  /**
   * Scope of the API key (global, role, or user)
   */
  scope: api_key_scope_enum().notNull(),
  /**
   * ID of the user who created this API key
   */
  created_by: text("created_by").notNull(),
  /**
   * ID of the entity this key has access to (user ID, role ID, etc.)
   */
  access_id: text("access_id").notNull(),
  /**
   * AI provider this key is for (e.g., "openai", "anthropic")
   */
  provider: text("provider").notNull(),
  /**
   * The actual API key value
   */
  key: text("key").notNull(),
  /**
   * Custom base URL for the provider, if applicable
   */
  custom_url: text("custom_url"),
});
