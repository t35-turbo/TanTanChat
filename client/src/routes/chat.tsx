import ChatSidebar from "@/components/ChatSidebar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/chat")({
  component: RouteComponent,
});

function RouteComponent() {
  const [sidebarSize, setSidebarSize] = useState(15);
  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarSize}%` } as React.CSSProperties}>
      <ResizablePanelGroup direction="horizontal" autoSaveId={"tantan-ui-chat-sidebar-size"}>
        <ResizablePanel minSize={15} defaultSize={20} onResize={setSidebarSize} order={1}>
          <ChatSidebar />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={50} defaultSize={80} order={2}>
          <Outlet />
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  );
}
