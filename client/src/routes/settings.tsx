import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Key, User, UserIcon } from "lucide-react";
import React from "react";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SidebarProvider defaultOpen={true} open={true}>
      <SidebarComponent />
      <Outlet />
    </SidebarProvider>
  );
}

function SidebarComponent() {
  const sidebar = useSidebar();
  const router = useRouter();
  const session = authClient.useSession();

  React.useEffect(() => {
    // why the fuck shadcn?? add a setOpenMobile pLEASE
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(true);
    }
  }, [sidebar.isMobile]);

  function exitSidebar() {
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <Sidebar>
      {sidebar.isMobile ? (
        <div className="flex items-center justify-between w-full mt-3">
          <Button variant="ghost" onClick={exitSidebar}>
            <ChevronLeft className="size-6" />
          </Button>

          <h1 className="absolute left-1/2 transform -translate-x-1/2 font-bold text-lg">Settings</h1>
        </div>
      ) : null}

      <SidebarGroup>
        <SidebarGroupLabel>User Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SettingsMenuButton>
              <Link to="/settings" replace><User />General</Link>
            </SettingsMenuButton>
            <SettingsMenuButton>
              <Link to="/settings/keys" replace><Key />Key Management</Link>
            </SettingsMenuButton>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Admin Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SettingsMenuButton>
              <Link to="/settings" replace><User />General</Link>
            </SettingsMenuButton>
            <SettingsMenuButton>
              <Link to="/settings/keys" replace><Key />Key Management</Link>
            </SettingsMenuButton>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </Sidebar>
  );
}

function SettingsMenuButton({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebar();

  return (
    <SidebarMenuItem className="relative flex items-center">
      <SidebarMenuButton asChild children={children} className="text-lg font-semibold z-10" onClick={() => sidebar.setOpenMobile(false)} />
      {sidebar.isMobile ? <ChevronRight className="absolute right-0 h-full" /> : null}
    </SidebarMenuItem>
  );
}
