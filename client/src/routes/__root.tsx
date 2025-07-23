import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";


export const Route = createRootRoute({
  component: () => (
    <ThemeProvider >
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-center" />
        <Outlet />
      </QueryClientProvider>
    </ThemeProvider>
  ),
});
