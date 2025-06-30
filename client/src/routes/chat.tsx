import ChatSidebar from "@/components/ChatSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";
import { SessionLoadingScreen } from "@/components/LoadingScreen";
import { WSProvider } from "@/components/WSManager";

export const Route = createFileRoute("/chat")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const userSession = authClient.useSession();

  const { chatId } = useParams({
    from: "/chat/$chatId",
    shouldThrow: false,
  }) ?? { chatId: undefined };

  useEffect(() => {
    if (!userSession.isPending && !userSession.data && !userSession.error) {
      navigate({ to: "/login" });
    }
  }, [userSession.isPending, userSession.data, userSession.error, navigate]);

  if (userSession.isPending) {
    return <SessionLoadingScreen />;
  }

  // Don't render the chat UI if not authenticated
  if (!userSession.data && !userSession.error) {
    return null;
  }

  return (
    <SidebarProvider>
      <WSProvider chatId={chatId}>
        <ChatSidebar />
        <Outlet />
      </WSProvider>
    </SidebarProvider>
  );
}
