import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import env from "./env";

export const auth = betterAuth({
  trustedOrigins: env.NODE_ENV == "development" ? ["http://localhost:3000"] : ["https://production-domain"],
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true, // defaults to true, set to false if you want to explicitly sign in after signup
  },

  socialProviders: {
    discord:
      env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
        ? {
            clientId: env.DISCORD_CLIENT_ID,
            clientSecret: env.DISCORD_CLIENT_SECRET,
          }
        : undefined,
  },

  database: drizzleAdapter(db, {
    // provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite",
    provider: "pg",
  }),
});
