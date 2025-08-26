import { boolean, json, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
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
  key: settings_enum().primaryKey().notNull().default("setting"),

  theme: json().$type<Theme>().default({ base: "mocha", color: "sapphire" }).notNull(),
  allow_new_signups: boolean().default(false).notNull(),
  email_provider: email_provider_enum().default("none").notNull(),

  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .$onUpdateFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const SystemSettingsSelect = createSelectSchema(system_settings);
export type SystemSettingsSelect = z.infer<typeof SystemSettingsSelect>;

export const SystemSettingsUpdate = createUpdateSchema(system_settings);
export type SystemSettingsUpdate = z.infer<typeof SystemSettingsUpdate>;

export const roles = pgTable("roles", {
  id: text("id").primaryKey().notNull(),
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
export const provider_scope_enum = pgEnum("provider_scope", ["global", "role", "user"]);
export const provider_type_enum = pgEnum("provider_type", [
  "openai",
  "google",
  "anthropic",
  "openrouter",
  "mistral",
  "deepseek",
  "groq",
]);
export const model_type_enum = pgEnum("model_type", ["text", "image", "stt", "tts"]);
export const providers = pgTable("providers", {
  // Unique identifier for the API key
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  // Name of the provider
  name: text("name").notNull(),
  // Whether the API key is currently enabled
  enabled: boolean("enabled").notNull().default(true),
  // Scope of the API key (global, role, or user)
  scope: provider_scope_enum().notNull(),
  // ID of the user who created this API key
  createdBy: text("created_by").notNull(),
  // ID of the entity this key has access to (user ID, role ID, etc.)
  accessId: text("access_id").notNull(),
  // AI provider this key is for (e.g., "openai", "anthropic")
  type: provider_type_enum().notNull(),
  // The actual API key value
  apiKey: text("key").notNull(),
  // Custom base URL for the provider, if applicable
  baseUrl: text("base_url").notNull(),

  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .$onUpdateFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const ProvidersInsert = createInsertSchema(providers);
export type ProvidersInsert = z.infer<typeof ProvidersInsert>;

export const ProvidersUpdate = createUpdateSchema(providers);
export type ProvidersUpdate = z.infer<typeof ProvidersUpdate>;

export const ProvidersSelect = createSelectSchema(providers);
export type ProvidersSelect = z.infer<typeof ProvidersSelect>;

export const provider_models = pgTable(
  "provider_models",
  {
    // Composite primary key from provider_id + model_id
    provider_id: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    model_id: text("model_id").notNull(), // User-provided model identifier
    model_name: text("model_name").notNull(), // Display name for the model
    model_type: model_type_enum().notNull(), // Type of model (text, image, stt, tts)
    enabled: boolean("enabled").notNull().default(true),

    created_at: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updated_at: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .$onUpdateFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite primary key
    primaryKey({ columns: [table.provider_id, table.model_id] }),
  ],
);

export const ProviderModelsInsert = createInsertSchema(provider_models);
export type ProviderModelsInsert = z.infer<typeof ProviderModelsInsert>;

export const ProviderModelsUpdate = createUpdateSchema(provider_models);
export type ProviderModelsUpdate = z.infer<typeof ProviderModelsUpdate>;

export const ProviderModelsSelect = createSelectSchema(provider_models);
export type ProviderModelsSelect = z.infer<typeof ProviderModelsSelect>;
