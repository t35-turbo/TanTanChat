import { SidebarBack } from "@/components/settings/BackButtons";
import SidebarAvatar from "@/components/SidebarAvatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient, authedRoute } from "@/lib/auth-client";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronRight, Key, User } from "lucide-react";
import React from "react";

export const Route = createFileRoute("/settings")({
  beforeLoad: authedRoute,
  component: SettingsRouteComponent,
});

export function SettingsRouteComponent() {
  return (
    <SidebarProvider defaultOpen={true} open={true}>
      <SidebarComponent />
      <Outlet />
    </SidebarProvider>
  );
}

function SidebarComponent() {
  const sidebar = useSidebar();
  const location = useLocation();

  const session = authClient.useSession();

  React.useEffect(() => {
    // why the fuck shadcn?? add a setOpenMobile pLEASE
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(true);
    }
  }, [sidebar.isMobile]);

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarBack />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>User Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SettingsMenuButton>
                <Link
                  to="/settings"
                  replace
                  className={`${location.pathname === "/settings" ? "bg-sidebar-accent" : ""}`}
                >
                  <User />
                  General
                </Link>
              </SettingsMenuButton>
              <SettingsMenuButton>
                <Link
                  to="/settings/keys"
                  replace
                  className={`${location.pathname === "/settings/keys" ? "bg-sidebar-accent/75" : ""}`}
                >
                  <Key />
                  Key Management
                </Link>
              </SettingsMenuButton>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {session.data?.user.role === "admin" ? (
          <SidebarGroup>
            <SidebarGroupLabel>Admin Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SettingsMenuButton>
                  <Link
                    to="/admin/settings"
                    replace
                    className={`${location.pathname === "/admin/settings" ? "bg-sidebar-accent/75" : ""}`}
                  >
                    <User />
                    General
                  </Link>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <Link
                    to="/admin/keys"
                    replace
                    className={`${location.pathname === "/admin/keys" ? "bg-sidebar-accent/75" : ""}`}
                  >
                    <Key />
                    Key Management
                  </Link>
                </SettingsMenuButton>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter className="flex flex-row mb-4 w-full">
        <SidebarAvatar />
      </SidebarFooter>
    </Sidebar>
  );
}

function SettingsMenuButton({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebar();

  return (
    <SidebarMenuItem className="relative flex items-center">
      <SidebarMenuButton
        asChild
        children={children}
        className="text-lg font-semibold z-10"
        onClick={() => sidebar.setOpenMobile(false)}
      />
      {sidebar.isMobile ? <ChevronRight className="absolute right-0 h-full" /> : null}
    </SidebarMenuItem>
  );
}
