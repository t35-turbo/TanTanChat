import KeyInputModal from "@/components/KeyInputModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider >
      <QueryClientProvider client={queryClient}>
        <KeyInputModal />
        <Toaster position="top-center" />
        <Outlet />
      </QueryClientProvider>
    </ThemeProvider>
  ),
});
