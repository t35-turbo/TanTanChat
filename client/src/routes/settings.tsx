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
import { createFileRoute, Outlet, Link as RouterLink, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, Key, LayoutDashboard, ShieldUser, SlidersHorizontal, Users } from "lucide-react";
import React from "react";

export const Route = createFileRoute("/settings")({
  beforeLoad: authedRoute,
  component: SettingsRouteComponent,
});

function SettingsRouteComponent() {
  return (
    <SidebarProvider open={true} defaultOpen={true} defaultOpenMobile={true}>
      <SidebarComponent />
      <Outlet />
    </SidebarProvider>
  );
}

export function SidebarComponent() {
  const session = authClient.useSession();

  console.log(session);

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
                <NavLink to="/settings">
                  <SlidersHorizontal />
                  General
                </NavLink>
              </SettingsMenuButton>
              <SettingsMenuButton>
                <NavLink to="/settings/keys">
                  <Key />
                  Key Management
                </NavLink>
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
                  <NavLink to="/admin">
                    <LayoutDashboard />
                    Dashboard
                  </NavLink>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <NavLink to="/admin/settings">
                    <SlidersHorizontal />
                    General
                  </NavLink>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <NavLink to="/admin/roles">
                    <ShieldUser />
                    Roles
                  </NavLink>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <NavLink to="/admin/users">
                    <Users />
                    Users
                  </NavLink>
                </SettingsMenuButton>
                <SettingsMenuButton>
                  <NavLink to="/admin/keys">
                    <Key />
                    Key Management
                  </NavLink>
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

function NavLink({
  to,
  children,
  className = "",
}: {
  to: LinkProps["to"];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RouterLink 
      to={to} 
      className={className}
      activeOptions={{ exact: true }}
      activeProps={{
        className: "bg-sidebar-accent/75"
      }}
    >
      {children}
    </RouterLink>
  );
}
