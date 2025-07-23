import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "./lib/auth";
import superjson from "superjson";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { roles } from "./db/settings.schema";

type Context = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authProcedure = publicProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

export const adminProcedure = authProcedure.use(async (opts) => {
  const role = await db.select().from(roles).where(and(eq(roles.id, opts.ctx.user?.role ?? ""), eq(roles.is_admin, true)));

  if (!role.length) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be an admin to access this resource",
    });
  }

  return opts.next();
});