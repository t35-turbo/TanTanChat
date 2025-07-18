import { z } from "zod";
import { authProcedure, router } from "./trpc";
import { userSettings } from "./db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";

export const settingsRouter = router({
  getKey: authProcedure.input(z.string()).query(async (opts) => {
    const result = await db
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(and(eq(userSettings.userId, opts.ctx.user.id), eq(userSettings.key, opts.input)));
    return result[0]?.value ?? null;
  }),
  getKeys: authProcedure.input(z.array(z.string())).query(async (opts) => {
    const results = await db
      .select({ key: userSettings.key, value: userSettings.value })
      .from(userSettings)
      .where(and(eq(userSettings.userId, opts.ctx.user.id), inArray(userSettings.key, opts.input)));
    return Object.fromEntries(results.map(({ key, value }) => [key, value]));
  }),

  setKey: authProcedure.input(z.tuple([z.string(), z.string()])).mutation(async (opts) => {
    const [key, value] = opts.input;
    const existing = await db
      .select({ key: userSettings.key })
      .from(userSettings)
      .where(and(eq(userSettings.userId, opts.ctx.user.id), eq(userSettings.key, key)));

    if (existing.length > 0) {
      await db
        .update(userSettings)
        .set({
          value: value,
          updatedAt: new Date(),
        })
        .where(and(eq(userSettings.userId, opts.ctx.user.id), eq(userSettings.key, key)));
    } else {
      await db.insert(userSettings).values({
        userId: opts.ctx.user.id,
        key: key,
        value: value,
        updatedAt: new Date(),
      });
    }
  }),
  setKeys: authProcedure.input(z.record(z.string(), z.string())).mutation(async (opts) => {
    const existing = new Set( // build a set of keys to check
      (
        await db
          .select({ key: userSettings.key })
          .from(userSettings)
          .where(and(eq(userSettings.userId, opts.ctx.user.id), inArray(userSettings.key, Object.keys(opts.input))))
      ).map((entry) => entry.key),
    );

    for (let record of Object.entries(opts.input)) {
      if (existing.has(record[0])) {
        await db
          .update(userSettings)
          .set({
            value: record[1],
            updatedAt: new Date(),
          })
          .where(and(eq(userSettings.userId, opts.ctx.user.id), eq(userSettings.key, record[0])));
      } else {
        await db.insert(userSettings).values({
          userId: opts.ctx.user.id,
          key: record[0],
          value: record[1],
          updatedAt: new Date(),
        });
      }
    }
  }),
});
