import { pgTable, text, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { user } from "./schema";

export const userSettings = pgTable("user_settings", {
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

export const systemSettings = pgTable("system_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  allow_local_keys: boolean().default(true),
  allow_byok: boolean().default(false),
  allow_custom_providers: boolean().default(true),
  allow_new_signups: boolean().default(false),

  created_at: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updated_at: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});
