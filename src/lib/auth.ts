import { betterAuth, User } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { files, system_settings, user_settings } from "../db/schema";
import { customAdmin } from "./admin-plugin";
import env from "./env";

const adapter = drizzleAdapter(db, {
  // provider: databaseUrl?.startsWith("postgresql") ? "pg" : "sqlite",
  provider: "pg",
});

/**
 * Initializes all created users to the "user" role.
 */
async function beforeCreateUserHook(user: User): Promise<{ data: User & { role: string } }> {
  return { data: { ...user, role: "user" } };
}

/**
 * Intializes a created user's settings.
 */
async function afterCreateUserHook(user: User): Promise<void> {
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
}

/**
 * Cleans up user files when a user is deleted.
 */
async function afterDeleteUserHook(user: User, ctx: any): Promise<void> {
  try {
    const userFiles = await db.select().from(files).where(eq(files.ownedBy, user.id));

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
}

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3001", "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async({ user, url, token }, request) => {

    }
  },

  plugins: [customAdmin()],

  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
      deleteTokenExpiresIn: 60,
      afterDelete: afterDeleteUserHook,
    },
    changeEmail: {
      enabled: true,
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

  database: adapter,

  databaseHooks: {
    user: {
      create: {
        before: beforeCreateUserHook,
        after: afterCreateUserHook,
      },
    },
  },

  logger: {
    disabled: false,
    level: "debug",
    log: (level, message, ...args) => {
      // Custom logging implementation
      console.log(`[${level}] ${message}`, ...args);
    },
  },
});
