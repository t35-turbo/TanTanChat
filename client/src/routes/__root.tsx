import KeyInputModal from "@/components/KeyInputModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="dark" storageKey="t3clone-ui-theme">
      <KeyInputModal />
      <Toaster position="top-center" />
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </ThemeProvider>
  ),
});
