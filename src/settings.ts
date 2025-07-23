import { z } from "zod";
import { authProcedure, router } from "./trpc";
import { userSettings } from "./db/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";

export const settingsRouter = router({
  get: authProcedure.query(async (opts) => {
    const result = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, opts.ctx.user.id));

    return result[0] || {
      user_id: opts.ctx.user.id,
      name: null,
      self_attr: null,
      traits: null,
      created_at: new Date(),
      updated_at: new Date()
    };
  }),

  update: authProcedure
    .input(z.object({
      name: z.string().nullable().optional(),
      self_attr: z.string().nullable().optional(),
      traits: z.string().nullable().optional(),
    }))
    .mutation(async (opts) => {
      const updateData = {
        ...opts.input,
        updatedAt: new Date(),
      };

      await db
        .insert(userSettings)
        .values({
          user_id: opts.ctx.user.id,
          ...updateData,
        })
        .onConflictDoUpdate({
          target: userSettings.user_id,
          set: {
            ...Object.fromEntries(
              Object.entries(updateData).filter(([_, value]) => value !== undefined)
            ),
          },
        });
    }),
});
