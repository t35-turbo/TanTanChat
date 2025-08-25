import { initTRPC, TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import superjson from "superjson";
import { db } from "./db/index.ts";
import { roles } from "./db/schema.ts";
import type { auth } from "./lib/auth.ts";

type Context = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const unAuthError = new TRPCError({
  code: "UNAUTHORIZED",
  message: "You must be logged in to access this resource",
});
export const notAdminError = new TRPCError({
  code: "UNAUTHORIZED",
  message: "You must be an admin to access this resource",
});

export const authProcedure = publicProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.session || !ctx.user) {
    throw unAuthError;
  }

  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

/**
 * Checks if a given role has admin privileges. Resolves to `true` if the user is admin.
 *
 * @param role - The role ID to check for admin status
 */
export async function isAdmin(role: string): Promise<boolean> {
  return (
    (
      await db
        .select()
        .from(roles)
        .where(and(eq(roles.id, role), eq(roles.is_admin, true)))
    ).length > 0
  );
}

export const adminProcedure = authProcedure.use(async (opts) => {
  if (!(await isAdmin(opts.ctx.user.role))) {
    throw notAdminError;
  }

  return opts.next();
});
