import { EmptyLoadingScreen } from "@/components/LoadingScreen";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      throw redirect({
        to: "/chat",
      });
    } else {
      throw redirect({
        to: "/login",
      });
    }
  },

  component: EmptyLoadingScreen,
});
