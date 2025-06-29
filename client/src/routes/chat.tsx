import ChatSidebar from "@/components/ChatSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";
import { SessionLoadingScreen } from "@/components/LoadingScreen";

export const Route = createFileRoute("/chat")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const userSession = authClient.useSession();

  useEffect(() => {
    // Only redirect if the session has finished loading and there's no authenticated user
    if (!userSession.isPending && !userSession.data && !userSession.error) {
      navigate({ to: "/login" });
    }
  }, [userSession.isPending, userSession.data, userSession.error, navigate]);

  // Show loading state while session is being determined
  if (userSession.isPending) {
    return <SessionLoadingScreen />;
  }

  // Don't render the chat UI if not authenticated
  if (!userSession.data && !userSession.error) {
    return null; // Will redirect to login
  }

  return (
    <SidebarProvider>
      <ChatSidebar />
      <Outlet />
    </SidebarProvider>
  );
}
