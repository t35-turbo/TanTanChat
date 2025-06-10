import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

const databaseUrl = process.env.DATABASE_URL;
const isDev = process.env.NODE_ENV == "development";
console.log("Auth started with mode: " + process.env.NODE_ENV);

export const auth = betterAuth({
  trustedOrigins: isDev
    ? ["http://localhost:3001"]
    : ["https://prodection-domain"],
  emailAndPassword: {
    enabled: true,
    // autoSignIn: true, // defaults to true, set to false if you want to explicitly sign in after signup
  },
  database: drizzleAdapter(db, {
    // provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite",
    provider: "pg",
  }),
});