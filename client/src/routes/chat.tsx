import ChatSidebar from "@/components/ChatSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";

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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
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
