import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { system_settings, user_settings, files } from "../db/schema";
import env from "./env";

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
      afterDelete: async (user) => {
        try {
          const userFiles = await db
            .select()
            .from(files)
            .where(eq(files.ownedBy, user.id));

          for (const file of userFiles) {
            try {
              if (env.USE_S3) {
                console.warn(`S3 file deletion not yet implemented for file: ${file.id}`);
              } else {
                await Bun.file(file.filePath).delete();
                console.log(`Deleted file: ${file.filePath}`);
              }
            } catch (fileError) {
              console.error(`Failed to delete file ${file.id} at ${file.filePath}:`, fileError);
            }
          }

          await db.delete(files).where(eq(files.ownedBy, user.id));

          console.log(`Cleaned up ${userFiles.length} files for deleted user: ${user.id}`);
        } catch (error) {
          console.error(`Error during file cleanup for user ${user.id}:`, error);
        }
      },
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
