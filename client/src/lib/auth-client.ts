import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { redirect } from "@tanstack/react-router";

export const authClient = createAuthClient({
  plugins: [adminClient()],
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
  if (!session.data || session.data?.user.role !== "admin") {
    throw redirect({
      to: "/login",
    });
  }
}