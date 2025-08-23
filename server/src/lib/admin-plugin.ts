import { generateId, type BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod/v4";
import { isAdmin } from "../trpc.ts";

async function throwIfAdmin(role: string) {
  if (!(await isAdmin(role))) {
    throw new APIError("FORBIDDEN", {
      message: "You must be an admin to access this resource",
    });
  }
}

export const customAdmin = () => {
  return {
    id: "admin",
    endpoints: {
      revokeAllSessions: createAuthEndpoint(
        "/admin/revoke-all-sessions",
        {
          method: "POST",
          body: z.object({
            userId: z.string(),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          ctx.context.logger.info(
            `Admin ${ctx.context.session.user.name} (${ctx.context.session.user.id}) revoking all sessions for ${ctx.body.userId}`,
          );
          const sessions = await ctx.context.internalAdapter.listSessions(ctx.body.userId);
          await ctx.context.internalAdapter.deleteSessions(ctx.body.userId);
          ctx.context.logger.info(`Revoked ${sessions.length} sessions for user ${ctx.body.userId}`);

          return ctx.json({
            success: true,
          });
        },
      ),

      updateUserName: createAuthEndpoint(
        "/admin/update-user-name",
        {
          method: "POST",
          body: z.object({
            userId: z.string(),
            name: z.string().min(1, "Name is required"),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          // Check if user is admin
          const userIsAdmin = await isAdmin(ctx.context.session.user.role);
          if (!userIsAdmin) {
            throw new APIError("FORBIDDEN", {
              message: "You must be an admin to access this resource",
            });
          }

          const updatedUser = await ctx.context.internalAdapter.updateUser(
            ctx.body.userId,
            { name: ctx.body.name.trim() },
            ctx,
          );

          return ctx.json({
            success: true,
            message: "User name updated successfully",
            user: updatedUser,
          });
        },
      ),

      updateUserEmail: createAuthEndpoint(
        "/admin/update-user-email",
        {
          method: "POST",
          body: z.object({
            userId: z.string(),
            email: z.email("Invalid email format"),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);
          const admin = ctx.context.session.user;
          ctx.context.logger.info(
            `Admin ${admin.name} (${admin.id}) updating user email for ${ctx.body.userId} to ${ctx.body.email}`,
          );

          // Check if email is already in use
          const existingUser = await ctx.context.internalAdapter.findUserByEmail(ctx.body.email);
          if (existingUser && existingUser.user.id !== ctx.body.userId) {
            ctx.context.logger.error("Attempted to update email to an already existing email");
            throw new APIError("BAD_REQUEST", {
              message: "Email is already in use by another user",
            });
          }

          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);

          if (!user) {
            ctx.context.logger.error("Attempted to update email for a non-existent user");
            throw new APIError("NOT_FOUND", {
              message: "User not found",
            });
          }

          const updatedUser = await ctx.context.internalAdapter.updateUser(
            ctx.body.userId,
            {
              email: ctx.body.email.trim(),
              emailVerified: true, // we consider admins to be Ex Cathedra
            },
            ctx,
          );

          return ctx.json({
            success: true,
            message: "User email updated successfully",
            user: updatedUser,
          });
        },
      ),

      setUserPassword: createAuthEndpoint(
        "/admin/set-user-password",
        {
          method: "POST",
          body: z.object({
            userId: z.string(),
            newPassword: z.string().min(6, "Password must be at least 6 characters"),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          const { userId, newPassword } = ctx.body;

          ctx.context.logger.info(
            `Admin ${ctx.context.session.user.name} (${ctx.context.session.user.id}) setting password for user ${userId}`,
          );

          if (newPassword.length < ctx.context.password.config.minPasswordLength) {
            ctx.context.logger.error(`Password is too short`);
            throw new APIError("BAD_REQUEST", {
              message: "Password is too short",
            });
          }
          if (newPassword.length > ctx.context.password.config.maxPasswordLength) {
            ctx.context.logger.error(`Password is too long`);
            throw new APIError("BAD_REQUEST", {
              message: "Password is too long",
            });
          }
          // hash password and update in db
          const hashedPassword = await ctx.context.password.hash(ctx.body.newPassword);
          await ctx.context.internalAdapter.updatePassword(ctx.body.userId, hashedPassword);
          await ctx.context.internalAdapter.deleteSessions(ctx.body.userId);

          return ctx.json({
            success: true,
            message: "User password updated successfully and all sessions revoked",
          });
        },
      ),

      removeUser: createAuthEndpoint(
        "/admin/remove-user",
        {
          method: "POST",
          body: z.object({
            userId: z.union([z.string(), z.string().array()]),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          const userIds = Array.isArray(ctx.body.userId) ? ctx.body.userId : [ctx.body.userId];
          const currentUserId = ctx.context.session.user.id;

          // Prevent admin from deleting themselves
          if (userIds.includes(currentUserId)) {
            throw new APIError("BAD_REQUEST", {
              message: "You cannot delete your own account",
            });
          }

          // Check if all users exist and collect results
          let deletedCount = 0;
          let notFoundCount = 0;

          for (const userId of userIds) {
            try {
              const user = await ctx.context.internalAdapter.findUserById(userId);
              if (!user) {
                notFoundCount++;
                continue;
              }

              // Delete the user using Better-Auth's internal adapter
              await ctx.context.internalAdapter.deleteUser(userId);
              deletedCount++;
            } catch (error) {
              // Log error but continue with other users
              console.error(`Failed to delete user ${userId}:`, error);
            }
          }

          const totalRequested = userIds.length;
          let message = "";

          if (deletedCount === totalRequested) {
            message = `Successfully deleted ${deletedCount} user${deletedCount === 1 ? "" : "s"}`;
          } else if (deletedCount > 0) {
            message = `Deleted ${deletedCount} of ${totalRequested} users`;
            if (notFoundCount > 0) {
              message += ` (${notFoundCount} not found)`;
            }
          } else {
            message = "No users were deleted";
            if (notFoundCount > 0) {
              message += ` (${notFoundCount} not found)`;
            }
          }

          return ctx.json({
            success: deletedCount > 0,
            message,
            deletedCount,
            totalRequested,
            notFoundCount,
          });
        },
      ),

      generatePasswordResetLink: createAuthEndpoint(
        "/admin/generate-password-reset-link",
        {
          method: "POST",
          body: z.object({
            userId: z.string(),
            sendEmail: z.boolean().optional().default(true),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          // Get user by ID to get their email
          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: "User not found",
            });
          }

          // Use Better-Auth's built-in password reset functionality
          // We'll create a verification token for password reset
          const defaultExpiresTime = 60 * 60; // 1 hour
          const expiresAt = new Date(
            Date.now() +
              1000 * (ctx.context.options.emailAndPassword?.resetPasswordTokenExpiresIn ?? defaultExpiresTime),
          );
          const verificationToken = generateId(24);

          // Store the verification token
          await ctx.context.internalAdapter.createVerificationValue({
            value: user.id,
            identifier: `reset-password:${verificationToken}`,
            expiresAt,
          });

          // Construct reset link path (client will add hostname)
          const resetLink = `/reset-password?token=${verificationToken}`;

          return ctx.json({
            success: true,
            resetLink,
            message: "Reset link generated and email sent",
          });
        },
      ),

      checkIsAdmin: createAuthEndpoint(
        "/admin/check-is-admin",
        {
          method: "GET",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const userIsAdmin = await isAdmin(ctx.context.session.user.role);

          return ctx.json({
            success: true,
            isAdmin: userIsAdmin,
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
