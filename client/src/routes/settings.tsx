import SidebarAvatar from "@/components/SidebarAvatar";
import { SidebarBack } from "@/components/settings/BackButtons";
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
import { ChevronRight, Key, LayoutDashboard, SlidersHorizontal, User } from "lucide-react";
import React from "react";

export const Route = createFileRoute("/settings")({
  beforeLoad: authedRoute,
  component: SettingsRouteComponent,
});

function SettingsRouteComponent() {
  return (
    <SidebarProvider defaultOpen={true} defaultOpenMobile={true}>
      <SidebarComponent />
      <Outlet />
    </SidebarProvider>
  );
}

export function SidebarComponent() {
  const location = useLocation();

  const session = authClient.useSession();

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
                <Link to="/settings" className={`${location.pathname === "/settings" ? "bg-sidebar-accent" : ""}`}>
                  <SlidersHorizontal />
                  General
                </Link>
              </SettingsMenuButton>
              <SettingsMenuButton>
                <Link
                  to="/settings/keys"
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
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SettingsMenuButton>
                  <Link to="/admin" className={`${location.pathname === "/admin" ? "bg-sidebar-accent/75" : ""}`}>
                    <LayoutDashboard />
                    Dashboard
                  </Link>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <Link
                    to="/admin/settings"
                    className={`${location.pathname === "/admin/settings" ? "bg-sidebar-accent/75" : ""}`}
                  >
                    <SlidersHorizontal />
                    General
                  </Link>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <Link
                    to="/admin/roles"
                    className={`${location.pathname === "/admin/roles" ? "bg-sidebar-accent/75" : ""}`}
                  >
                    <User />
                    Role Management
                  </Link>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <Link
                    to="/admin/keys"
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

      <SidebarFooter className="mb-4 flex w-full flex-row">
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
        className="z-10 text-lg font-semibold"
        onClick={() => {
          sidebar.setOpenMobile(false);
          sidebar.setOpen(false);
        }}
      />
      {sidebar.isMobile ? <ChevronRight className="absolute right-0 h-full" /> : null}
    </SidebarMenuItem>
  );
}
