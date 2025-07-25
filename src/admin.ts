import { count, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "./db";
import { roles, system_settings, SystemSettingsSelect, SystemSettingsUpdate, user } from "./db/schema";
import { adminProcedure, router } from "./trpc";

const systemSettingsKeys = z.enum(
  Object.keys(SystemSettingsSelect.shape) as [keyof SystemSettingsSelect, ...Array<keyof SystemSettingsSelect>],
);

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
  },
});
