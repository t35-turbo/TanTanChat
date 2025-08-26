import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import z from "zod";
import { db } from "./db/index.ts";
import {
  ProvidersInsert,
  ProvidersUpdate,
  UserSettingsUpdate,
  provider_models,
  providers,
  user_settings,
} from "./db/schema.ts";
import { authProcedure, isAdmin, router } from "./trpc.ts";

const providerProcedure = authProcedure.input(z.object({ id: z.string() })).use(async (opts) => {
  const provider = (await db.select().from(providers).where(eq(providers.id, opts.input.id)))[0];
  if (!provider || (opts.ctx.user.id !== provider.createdBy && !isAdmin(opts.ctx.user.role))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The relevant Chat was not found.",
    });
  }

  return opts.next();
});

export const settingsRouter = router({
  get: authProcedure.query(async (opts) => {
    return (await db.select().from(user_settings).where(eq(user_settings.user_id, opts.ctx.user.id)).limit(1))[0];
  }),

  set: authProcedure.input(UserSettingsUpdate).mutation(async (opts) => {
    await db.update(user_settings).set(opts.input).where(eq(user_settings.user_id, opts.ctx.user.id));
  }),

  addProvider: authProcedure
    .input(ProvidersInsert.omit({ createdBy: true }).partial({ accessId: true }))
    .mutation(async (opts) => {
      if (!isAdmin(opts.ctx.user.role) && opts.input.scope !== "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
        });
      }

      return await db
        .insert(providers)
        .values({ createdBy: opts.ctx.user.id, accessId: opts.ctx.user.id, ...opts.input });
    }),
  listProviders: authProcedure.query(async (opts) => {
    return await db
      .select({
        enabled: providers.enabled,
        name: providers.name,
        id: providers.id,
        type: providers.type,
        baseUrl: providers.baseUrl,
        modelsCount: count(provider_models.model_id),
      })
      .from(providers)
      .where(and(eq(providers.createdBy, opts.ctx.user.id), eq(providers.accessId, opts.ctx.user.id)))
      .leftJoin(provider_models, eq(provider_models.provider_id, providers.id))
      .groupBy(providers.id);
  }),
  getProvider: providerProcedure.mutation(async (opts) => {
    return (await db.select().from(providers).where(eq(providers.id, opts.input.id)))[0];
  }),
  updateProvider: providerProcedure.input(ProvidersUpdate).mutation(async (opts) => {
    return await db.update(providers).set(opts.input).where(eq(providers.id, opts.input.id));
  }),
  deleteProvider: providerProcedure.mutation(async (opts) => {
    return await db.delete(providers).where(eq(providers.id, opts.input.id));
  }),
});
