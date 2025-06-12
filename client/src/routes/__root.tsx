import KeyInputModal from "@/components/KeyInputModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider defaultTheme="system" storageKey="tantan-ui-theme">
      <QueryClientProvider client={queryClient}>
        <KeyInputModal />
        <Toaster position="top-center" />
        <Outlet />
        {/* <TanStackRouterDevtools /> */}
      </QueryClientProvider>
    </ThemeProvider>
  ),
});
