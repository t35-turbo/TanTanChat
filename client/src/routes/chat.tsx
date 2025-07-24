import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import ChatSidebar from "@/components/ChatSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WSProvider } from "@/components/WSManager";
import { authedRoute } from "@/lib/auth-client";

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
