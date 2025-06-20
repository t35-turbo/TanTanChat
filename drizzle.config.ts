import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import env from "./src/lib/env";

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL
  },
});
