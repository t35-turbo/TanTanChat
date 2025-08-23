import { and, count, countDistinct, desc, eq, gt, ilike, inArray, lt, or, SQL } from "drizzle-orm";
import { createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { db } from "./db/index.ts";
import {
  chat_messages,
  chats,
  roles,
  system_settings,
  SystemSettingsSelect,
  SystemSettingsUpdate,
  user,
} from "./db/schema.ts";
import { auth } from "./lib/auth.ts";
import { adminProcedure, publicProcedure, router } from "./trpc.ts";

const systemSettingsKeys = z.enum(
  Object.keys(SystemSettingsSelect.shape) as [keyof SystemSettingsSelect, ...Array<keyof SystemSettingsSelect>],
);

const RoleUpdate = createUpdateSchema(roles);

type GetSettingsInput = z.infer<typeof systemSettingsKeys>[];

type GetSettingsReturn<T extends GetSettingsInput | undefined> = T extends undefined
  ? SystemSettingsSelect | undefined
  : T extends GetSettingsInput
    ? Pick<SystemSettingsSelect, T[number]> | undefined
    : never;

export const adminRouter = router({
  checkRoleIsAdmin: publicProcedure.input(z.string()).query(async ({ input }) => {
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, input),
      columns: { is_admin: true },
    });
    return { isAdmin: role?.is_admin ?? false };
  }),

  settings: {
    get: adminProcedure
      .input(z.optional(z.array(systemSettingsKeys)))
      .query(async <T extends GetSettingsInput | undefined>(opts: { input: T }): Promise<GetSettingsReturn<T>> => {
        if (!opts.input) {
          return (await db.query.system_settings.findFirst()) as GetSettingsReturn<T>;
        } else {
          const columns: Record<string, boolean> = {};

          opts.input.forEach((col) => {
            columns[col] = true;
          });

          return (await db.query.system_settings.findFirst({
            columns,
          })) as GetSettingsReturn<T>;
        }
      }),

    set: adminProcedure.input(SystemSettingsUpdate).mutation(async (opts) => {
      await db.update(system_settings).set(opts.input);
    }),
  },
  roles: {
    list: adminProcedure.query(async () => {
      return db
        .select({
          id: roles.id,
          name: roles.name,
          color: roles.color,
          allow_local_keys: roles.allow_local_keys,
          allow_byok: roles.allow_byok,
          allow_custom_providers: roles.allow_custom_providers,
          is_admin: roles.is_admin,
          created_at: roles.created_at,
          updated_at: roles.updated_at,
          user_count: count(user.id),
        })
        .from(roles)
        .leftJoin(user, eq(roles.id, user.role))
        .groupBy(roles.id);
    }),

    get: adminProcedure.input(z.string()).query(async (opts) => {
      const role = await db.query.roles.findFirst({
        where: eq(roles.id, opts.input),
      });

      if (!role) {
        throw new Error("Role not found");
      }

      return role;
    }),

    update: adminProcedure.input(RoleUpdate.required()).mutation(async (opts) => {
      await db.update(roles).set(opts.input).where(eq(roles.id, opts.input.id));

      return { success: true };
    }),

    getMembers: adminProcedure.input(z.string()).query(async (opts) => {
      return db.select().from(user).where(eq(user.role, opts.input));
    }),

    setMemberRole: adminProcedure
      .input(z.object({ roleId: z.string(), userId: z.union([z.string(), z.string().array()]) }))
      .mutation(async (opts) => {
        if (Array.isArray(opts.input.userId)) {
          await db.update(user).set({ role: opts.input.roleId }).where(inArray(user.id, opts.input.userId));
        } else {
          await db.update(user).set({ role: opts.input.roleId }).where(eq(user.id, opts.input.userId));
        }
        return { success: true };
      }),

    search: adminProcedure.input(z.string()).query(async (opts) => {
      return db
        .select()
        .from(roles)
        .where(or(ilike(roles.name, `%${opts.input}%`), ilike(roles.name, `%${opts.input}%`)))
        .limit(5);
    }),
  },

  checkIsAdmin: adminProcedure.query(async () => {
    // If this procedure runs successfully, the user is admin
    // (adminProcedure already checks isAdmin via your existing logic)
    return { isAdmin: true };
  }),

  users: {
    get: adminProcedure.input(z.string()).query(async (opts) => {
      return {
        user: (
          await db
            .select({
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified,
              image: user.image,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              role: roles,
            })
            .from(user)
            .where(eq(user.id, opts.input))
            .leftJoin(roles, eq(roles.id, user.role))
        )[0],
      };
    }),

    search: adminProcedure.input(z.string()).query(async (opts) => {
      return db
        .select({ name: user.name, id: user.id, role: user.role, email: user.email })
        .from(user)
        .where(ilike(user.name, `%${opts.input}%`))
        .limit(10);
    }),

    paginatedSearchList: adminProcedure
      .input(
        z.object({
          limit: z.number().min(10).max(100),
          query: z.string(),
          cursor: z.string().nullish(),
          roleId: z.string().optional(),
        }),
      )
      .query(async (opts) => {
        let condition: SQL<unknown> | undefined = ilike(user.name, `%${opts.input.query}`);
        if (opts.input.cursor) {
          condition = and(gt(user.createdAt, new Date(opts.input.cursor)), condition);
        }
        if (opts.input.roleId) {
          condition = and(eq(user.role, opts.input.roleId), condition);
        }

        const items = await db
          .select({ name: user.name, id: user.id, role: roles.name, email: user.email, createdAt: user.createdAt })
          .from(user)
          .where(condition)
          .orderBy(user.createdAt)
          .limit(opts.input.limit)
          .leftJoin(roles, eq(user.role, roles.id));

        return {
          items,
          nextCursor: items.length === opts.input.limit ? items[items.length - 1]?.createdAt.toISOString() : null,
        };
      }),
    pagesCount: adminProcedure.input(z.object({ limit: z.number(), query: z.string() })).query(async (opts) => {
      return Math.ceil(
        (
          await db
            .select({ count: count() })
            .from(user)
            .where(ilike(user.name, `%${opts.input.query}%`))
        )[0].count / opts.input.limit,
      );
    }),

    setPassword: adminProcedure
      .input(z.object({ userId: z.string(), newPassword: z.string() }))
      .mutation(async (opts) => {
        try {
          await auth.api.revokeAllSessions({
            body: { userId: opts.input.userId },
          });
          return {
            ...(await auth.api.setPassword({
              body: { newPassword: opts.input.newPassword },
            })),
            error: undefined,
          };
        } catch (err: any) {
          return {
            error: {
              message: err.message,
              status: 500,
              statusText: err.statusText,
            },
          };
        }
      }),

    getChats: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          limit: z.number().min(1).max(50).default(20),
          cursor: z.string().nullish(),
        }),
      )
      .query(async (opts) => {
        const { userId, limit, cursor } = opts.input;

        // Build where conditions
        let whereConditions: SQL<unknown> | undefined = eq(chats.userId, userId);
        if (cursor) {
          whereConditions = and(whereConditions, lt(chats.updated_at, new Date(cursor)));
        }

        // Fetch one extra item to determine if there's a next page
        const userChats = await db
          .select({
            id: chats.id,
            title: chats.title,
            updated_at: chats.updated_at,
            messageCount: count(chat_messages.id),
          })
          .from(chats)
          .leftJoin(chat_messages, and(eq(chats.id, chat_messages.chatId), eq(chat_messages.senderId, userId)))
          .where(whereConditions)
          .groupBy(chats.id, chats.title, chats.updated_at)
          .orderBy(desc(chats.updated_at))
          .limit(limit + 1);

        // Check if there's a next page
        const hasNextPage = userChats.length > limit;
        const items = hasNextPage ? userChats.slice(0, limit) : userChats;
        const nextCursor = hasNextPage ? items[items.length - 1]?.updated_at.toISOString() : null;

        return {
          items,
          nextCursor,
        };
      }),

    getChatStats: adminProcedure.input(z.string()).query(async (opts) => {
      const stats = await db
        .select({
          totalChats: countDistinct(chats.id),
          totalMessages: count(chat_messages.id),
        })
        .from(chats)
        .leftJoin(chat_messages, and(eq(chats.id, chat_messages.chatId), eq(chat_messages.senderId, opts.input)))
        .where(eq(chats.userId, opts.input));

      const recentActivity = await db
        .select({
          date: chats.updated_at,
        })
        .from(chats)
        .where(eq(chats.userId, opts.input))
        .orderBy(desc(chats.updated_at))
        .limit(1);

      return {
        ...stats[0],
        lastActivity: recentActivity[0]?.date || null,
      };
    }),
  },
});
