import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

const databaseUrl = process.env.DATABASE_URL;
const isDev = process.env.NODE_ENV == "development";

export const auth = betterAuth({
  trustedOrigins: isDev
    ? ["http://localhost:3000"]
    : ["https://production-domain"],
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true, // defaults to true, set to false if you want to explicitly sign in after signup
  },

  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    },
  },

  database: drizzleAdapter(db, {
    // provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite",
    provider: "pg",
  }),
});