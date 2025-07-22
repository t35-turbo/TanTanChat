import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/settings/keys")({
  component: RouteComponent,
});

function RouteComponent() {
  const sidebar = useSidebar();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 p-4 w-full">
      {sidebar.isMobile ? (
        <Button
          variant="ghost"
          className="mr-auto p-0 max-w-4"
          onClick={() => {
            sidebar.setOpenMobile(true);
          }}
        >
          <ChevronLeft className="size-6" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="max-w-32"
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
      )}
    </div>
  );
}
