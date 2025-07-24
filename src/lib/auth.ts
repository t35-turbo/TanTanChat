import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "../db";

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3001", "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true, // defaults to true, set to false if you want to explicitly sign in after signup
  },

  plugins: [admin()],

  user: {
    deleteUser: {
      enabled: true,
      deleteTokenExpiresIn: 60,
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  // socialProviders: {
  //   discord:
  //     env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
  //       ? {
  //         clientId: env.DISCORD_CLIENT_ID,
  //         clientSecret: env.DISCORD_CLIENT_SECRET,
  //       }
  //       : undefined,
  // },

  database: drizzleAdapter(db, {
    // provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite",
    provider: "pg",
  }),
});
