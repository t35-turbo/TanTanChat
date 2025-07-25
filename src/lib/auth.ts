import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "../db";
import { system_settings, user_settings } from "../db/schema";

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

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const defaultTheme = (
            await db
              .select({
                theme: system_settings.theme,
              })
              .from(system_settings)
          )[0].theme;

          await db.insert(user_settings).values({
            user_id: user.id,
            theme: { ...defaultTheme, sync: true },
          });
        },
      },
    },
  },
});
