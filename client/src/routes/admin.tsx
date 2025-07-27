import { SidebarProvider } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarComponent } from "./settings";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user.role !== "admin") {
      throw redirect({
        to: "/chat",
      });
    }
  },
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return (
    <SidebarProvider open={true} defaultOpen={true} defaultOpenMobile={false}>
      <SidebarComponent />
      <Outlet />
    </SidebarProvider>
  );
}