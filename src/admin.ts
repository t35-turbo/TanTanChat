import { db } from "./db";
import { adminProcedure, router } from "./trpc";
import { z } from "zod/v4";

import { system_settings, SystemSettingsSelect, SystemSettingsUpdate } from "./db/schema";

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
          let columns: Record<string, boolean> = {};

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
});
