import { SidebarBack } from "@/components/settings/BackButtons";
import {
  Sidebar,
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
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ChevronRight, Key, User } from "lucide-react";
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
  const location = useLocation();

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

      <SidebarGroup>
        <SidebarGroupLabel>User Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SettingsMenuButton>
              <Link to="/settings" replace className={`${location.pathname === "/settings" ? "bg-sidebar-accent" : ""}`}>
                <User />
                General
              </Link>
            </SettingsMenuButton>
            <SettingsMenuButton>
              <Link to="/settings/keys" replace className={`${location.pathname === "/settings/keys" ? "bg-sidebar-accent/75" : ""}`}>
                <Key />
                Key Management
              </Link>
            </SettingsMenuButton>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Admin Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SettingsMenuButton>
              <Link to="/settings" replace>
                <User />
                General
              </Link>
            </SettingsMenuButton>
            <SettingsMenuButton>
              <Link to="/settings/keys" replace>
                <Key />
                Key Management
              </Link>
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
