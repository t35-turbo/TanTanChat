import { eq } from "drizzle-orm";
import { db } from "./db";
import { UserSettingsUpdate, user_settings } from "./db/schema";
import { authProcedure, router } from "./trpc";

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

  set: authProcedure.input(UserSettingsUpdate.omit({ api_keys: true })).mutation(async (opts) => {
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
