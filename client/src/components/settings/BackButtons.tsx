import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";

export function PageBack() {
  const sidebar = useSidebar();

  return sidebar.isMobile ? (
    <Button
      variant="ghost"
      className="mr-auto p-0 max-w-4"
      onClick={() => {
        sidebar.setOpenMobile(true);
      }}
    >
      <ChevronLeft className="size-6" />
    </Button>
  ) : null;
}

export function SidebarBack() {
  const sidebar = useSidebar();
  const router = useRouter();

  return sidebar.isMobile ? (
    <div className="flex items-center justify-between w-full mt-3">
      <Button
        variant="ghost"
        onClick={() => {
          if (router.history.canGoBack()) {
            router.history.back();
          } else {
            router.navigate({ to: "/" });
          }
        }}
      >
        <ChevronLeft className="size-6" />
      </Button>

      <h1 className="absolute left-1/2 transform -translate-x-1/2 font-bold text-lg">Settings</h1>
    </div>
  ) : (
    <Button
      variant="ghost"
      className="justify-start"
      onClick={() => {
        if (router.history.canGoBack()) {
          router.history.back();
        } else {
          router.navigate({ to: "/chat" });
        }
      }}
    >
      <ArrowLeft />
      Back to chat
    </Button>
  );
}
