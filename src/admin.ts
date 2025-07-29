import { and, count, eq, gt, ilike, inArray, or } from "drizzle-orm";
import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { db } from "./db";
import { roles, system_settings, SystemSettingsSelect, SystemSettingsUpdate, user } from "./db/schema";
import { adminProcedure, router } from "./trpc";

const systemSettingsKeys = z.enum(
  Object.keys(SystemSettingsSelect.shape) as [keyof SystemSettingsSelect, ...Array<keyof SystemSettingsSelect>],
);

const RoleSelect = createSelectSchema(roles);
const RoleUpdate = createUpdateSchema(roles);

type GetSettingsInput = z.infer<typeof systemSettingsKeys>[];

type GetSettingsReturn<T extends GetSettingsInput | undefined> = T extends undefined
  ? SystemSettingsSelect | undefined
  : T extends GetSettingsInput
    ? Pick<SystemSettingsSelect, T[number]> | undefined
    : never;

export const adminRouter = router({
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

  users: {
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
        }),
      )
      .query(async (opts) => {
        const items = await db
          .select({ name: user.name, id: user.id, role: roles.name, email: user.email, createdAt: user.createdAt })
          .from(user)
          .where(
            opts.input.cursor
              ? and(ilike(user.name, `%${opts.input.query}%`), gt(user.createdAt, new Date(opts.input.cursor)))
              : ilike(user.name, `%${opts.input.query}%`),
          )
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
  },
});
