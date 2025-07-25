import { count, eq, ilike } from "drizzle-orm";
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

    addMember: adminProcedure.input(z.object({ roleId: z.string(), userId: z.string() })).mutation(async (opts) => {
      await db.update(user).set({ role: opts.input.roleId }).where(eq(user.id, opts.input.userId));
      return { success: true };
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
  },
});
