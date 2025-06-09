import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

const databaseUrl = process.env.DATABASE_URL;

export const auth = betterAuth({
  basePath: '/api/auth',
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true, // defaults to true, set to false if you want to explicitly sign in after signup
  },
  database: drizzleAdapter(db, {
    provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite",
  }),
});