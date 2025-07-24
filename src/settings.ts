import { authProcedure, router } from "./trpc";
import { user_settings, UserSettingsUpdate } from "./db/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";

export const settingsRouter = router({
  get: authProcedure.query(async (opts) => {
    const result = await db.select().from(user_settings).where(eq(user_settings.user_id, opts.ctx.user.id));

    return (
      result[0] || {
        user_id: opts.ctx.user.id,
        name: null,
        self_attr: null,
        traits: null,
        created_at: new Date(),
      }
    );
  }),

  update: authProcedure.input(UserSettingsUpdate.omit({ api_keys: true })).mutation(async (opts) => {
    const updateData = {
      ...opts.input,
    };

    await db
      .insert(user_settings)
      .values({
        user_id: opts.ctx.user.id,
        ...updateData,
      })
      .onConflictDoUpdate({
        target: user_settings.user_id,
        set: {
          ...Object.fromEntries(Object.entries(updateData).filter(([_, value]) => value !== undefined)),
        },
      });
  }),
});
