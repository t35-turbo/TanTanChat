import { eq } from "drizzle-orm";
import { db } from "./db";
import { UserSettingsUpdate, user_settings } from "./db/schema";
import { authProcedure, router } from "./trpc";

export const settingsRouter = router({
  get: authProcedure.query(async (opts) => {
    return (await db.select().from(user_settings).where(eq(user_settings.user_id, opts.ctx.user.id)).limit(1))[0];
  }),

  set: authProcedure.input(UserSettingsUpdate.omit({ api_keys: true })).mutation(async (opts) => {
    await db.update(user_settings).set(opts.input).where(eq(user_settings.user_id, opts.ctx.user.id));
  }),
});
