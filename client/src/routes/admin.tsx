import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsRouteComponent } from "./settings";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({}) => {
    const session = await authClient.getSession();
    if (session.data?.user.role !== "admin") {
      throw redirect({
        to: "/chat",
      });
    }
  },
  component: SettingsRouteComponent,
});
