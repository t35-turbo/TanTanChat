import ChatSidebar from "@/components/ChatSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { authClient, authedRoute } from "@/lib/auth-client";
import { WSProvider } from "@/components/WSManager";

export const Route = createFileRoute("/chat")({
  beforeLoad: authedRoute,
  component: RouteComponent,
});

function RouteComponent() {
  const { chatId } = useParams({
    from: "/chat/$chatId",
    shouldThrow: false,
  }) ?? { chatId: undefined };

  return (
    <SidebarProvider>
      <WSProvider chatId={chatId}>
        <ChatSidebar />
        <Outlet />
      </WSProvider>
    </SidebarProvider>
  );
}
