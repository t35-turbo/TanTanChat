import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import env from "../lib/env";

const db = drizzle(env.DATABASE_URL, { schema });

// Seed default roles
export async function seedDefaults() {
  const defaultRoles = [
    {
      id: "user",
      allow_local_keys: true,
      allow_byok: false,
      allow_custom_providers: true,
      allow_new_signups: false,
    },
    {
      id: "admin",
      allow_local_keys: true,
      allow_byok: true,
      allow_custom_providers: true,
      allow_new_signups: true,
    },
  ];

  for (const role of defaultRoles) {
    await db.insert(schema.roles).values(role).onConflictDoNothing();
  }

  let settings = await db.query.system_settings.findFirst();
  if (!settings) {
    await db.insert(schema.system_settings).values({
      key: "setting",
      allow_new_signups: true,
    }).onConflictDoNothing();
  }
}

export { db };
