import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { Button } from "../ui/button";
import { useSidebar } from "../ui/sidebar";

export function PageBack() {
  const sidebar = useSidebar();

  return sidebar.isMobile ? (
    <Button
      variant="ghost"
      className="mr-auto max-w-4 p-0"
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
    <div className="mt-3 flex w-full items-center justify-between">
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

      <h1 className="absolute left-1/2 -translate-x-1/2 transform text-lg font-bold">Settings</h1>
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
