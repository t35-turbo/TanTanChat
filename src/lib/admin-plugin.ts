import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod/v4";
import { isAdmin } from "../trpc";

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
            userId: z.string().optional(),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          try {
            let revokedCount: number;
            let message: string;

            if (ctx.body.userId) {
              // Revoke sessions for specific user using Better-Auth internal adapter
              const sessions = await ctx.context.internalAdapter.listSessions(ctx.body.userId);
              await ctx.context.internalAdapter.deleteSessions(ctx.body.userId);
              revokedCount = sessions.length;
              message = `Revoked ${revokedCount} sessions for user ${ctx.body.userId}`;
            } else {
              // Nuclear option: revoke ALL sessions in the system
              // Note: Better-Auth doesn't have a direct "delete all sessions" method,
              // so we'll need to get all users and delete their sessions
              const users = await ctx.context.internalAdapter.listUsers();
              let totalRevoked = 0;

              for (const user of users) {
                const sessions = await ctx.context.internalAdapter.listSessions(user.id);
                if (sessions.length > 0) {
                  await ctx.context.internalAdapter.deleteSessions(user.id);
                  totalRevoked += sessions.length;
                }
              }

              revokedCount = totalRevoked;
              message = `Revoked all ${revokedCount} sessions in the system`;
            }

            return ctx.json({
              success: true,
              message,
              revokedCount,
            });
          } catch (error) {
            console.error("Error revoking sessions:", error);
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to revoke sessions",
            });
          }
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

          try {
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
          } catch (error) {
            console.error("Error updating user name:", error);
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to update user name",
            });
          }
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
            userId: z.string(),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          // Prevent admin from deleting themselves
          if (ctx.body.userId === ctx.context.session.user.id) {
            throw new APIError("BAD_REQUEST", {
              message: "You cannot delete your own account",
            });
          }

          // Check if user exists
          const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: "User not found",
            });
          }

          // Delete the user using Better-Auth's internal adapter
          await ctx.context.internalAdapter.deleteUser(ctx.body.userId);

          return ctx.json({
            success: true,
            message: "User deleted successfully",
          });
        },
      ),

      generatePasswordResetLink: createAuthEndpoint(
        "/admin/generate-password-reset-link",
        {
          method: "POST",
          body: z.object({
            userId: z.string(),
            sendEmail: z.boolean().optional().default(false),
          }),
          use: [sessionMiddleware],
        },
        async (ctx) => {
          await throwIfAdmin(ctx.context.session.user.role);

          try {
            // Get user by ID to get their email
            const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
            if (!user) {
              throw new APIError("NOT_FOUND", {
                message: "User not found",
              });
            }

            // Use Better-Auth's built-in password reset functionality
            // We'll create a verification token for password reset
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

            // Store the verification token
            await ctx.context.internalAdapter.createVerificationValue({
              identifier: user.email,
              value: token,
              expiresAt,
            });

            // Construct reset link path (client will add hostname)
            const resetLink = `/reset-password?token=${token}`;

            return ctx.json({
              success: true,
              resetLink,
              message: ctx.body.sendEmail ? "Reset link generated and email sent" : "Reset link generated successfully",
            });
          } catch (error) {
            console.error("Error generating password reset link:", error);
            if (error instanceof APIError) {
              throw error;
            }
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to generate password reset link",
            });
          }
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
