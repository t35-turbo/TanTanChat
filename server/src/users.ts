import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "./db/index.ts";
import { user } from "./db/schema.ts";
import { roles } from "./db/schema.ts";
import { authProcedure, isAdmin, notAdminError, router } from "./trpc.ts";

export const usersRouter = router({
  /**
   * Retrieves a user along with their role information.
   * If no input is provided, returns the current user's data.
   * If an admin provides another user's ID, returns that user's data.
   * Non-admin users can only access their own data.
   */
  withRole: authProcedure.input(z.string().optional()).query(async ({ ctx, input }) => {
    let targetUser = ctx.user;

    if (input && input !== ctx.user.id) {
      if (await isAdmin(ctx.user.role)) {
        const users = await db.select().from(user).where(eq(user.id, input));
        if (users.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        targetUser = users[0];
      } else {
        throw notAdminError;
      }
    }

    let role = (await db.select().from(roles).where(eq(roles.id, targetUser.role)))[0];

    if (role) {
      return { ...targetUser, role };
    } else {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get role",
      });
    }
  }),

  /**
   * Retrieves user data by ID.
   * If no input is provided, returns the current user.
   * If an admin provides another user's ID, returns that user's data.
   * Non-admin users can only access their own data.
   */
  get: authProcedure.input(z.string().optional()).query(async (opts) => {
    if (!opts.input || opts.input === opts.ctx.user.id) {
      return opts.ctx.user;
    } else if (await isAdmin(opts.ctx.user.role)) {
      return await db.select().from(user).where(eq(user.id, opts.input));
    } else {
      throw notAdminError;
    }
  }),
});
