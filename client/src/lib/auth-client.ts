import { redirect } from "@tanstack/react-router";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../server/src/lib/auth";
import { customAdminClient } from "./admin-client-plugin";
import { __client } from "./trpc";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), customAdminClient()],
});

export async function authedRoute() {
  const session = await authClient.getSession();
  if (!session.data) {
    throw redirect({
      to: "/login",
    });
  }
}

export async function adminAuthedRoute() {
  const session = await authClient.getSession();
  if (!session.data) {
    throw redirect({
      to: "/login",
    });
  }

  // Check if user is admin using your role system
  // This will need to be implemented via tRPC call since client can't access DB directly
  // For now, we'll create a placeholder that needs to be replaced with proper role checking
  const isAdmin = await checkUserIsAdmin(session.data.user.role);
  if (!isAdmin) {
    throw redirect({
      to: "/login",
    });
  }
}

// Helper function to check if user is admin using your role system
async function checkUserIsAdmin(userRole: string): Promise<boolean> {
  try {
    const result = await __client.admin.checkRoleIsAdmin.query(userRole);
    return result.isAdmin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
