import { drizzle } from "drizzle-orm/node-postgres";
import env from "../lib/env";
import * as schema from "./schema";

const db = drizzle(env.DATABASE_URL, { schema });

// Seed default roles
export async function seedDefaults() {
  const defaultRoles = [
    {
      id: "user",
      name: "User",
      allow_local_keys: true,
      allow_byok: true,
      allow_custom_providers: false,
      allow_new_signups: false,
    },
    {
      id: "admin",
      name: "Admin",
      allow_local_keys: true,
      allow_byok: true,
      allow_custom_providers: true,
      allow_new_signups: true,
    },
  ];

  for (const role of defaultRoles) {
    await db.insert(schema.roles).values(role).onConflictDoNothing();
  }

  const settings = await db.query.system_settings.findFirst();
  if (!settings) {
    await db
      .insert(schema.system_settings)
      .values({
        key: "setting",
        allow_new_signups: true,
      })
      .onConflictDoNothing();
  }
}

export { db };
