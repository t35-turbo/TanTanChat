import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

const databaseUrl = process.env.DATABASE_URL;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite", // or "mysql"
  }),
});