import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        name: "description",
        content: "TanTanChat is a fast and free web chat app.",
      },
      {
        title: "TanTan",
      },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
  component: () => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HeadContent />
        <Toaster position="top-center" />
        <Outlet />
        <ReactQueryDevtools client={queryClient} />
      </ThemeProvider>
    </QueryClientProvider>
  ),
});
