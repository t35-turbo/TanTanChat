import type { Theme } from "@/../../server/src/db/settings.schema";
import { useTheme } from "@/hooks/use-theme";
import { __client, trpc } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const localBase = useTheme((state) => state.base);
  const localColor = useTheme((state) => state.color);
  const setBase = useTheme((state) => state.setBase);
  const setColor = useTheme((state) => state.setColor);

  // Query server theme settings
  const serverQuery = useQuery({
    queryKey: trpc.settings.get.queryKey(),
    queryFn: async () => {
      try {
        const settings = await __client.settings.get.query();
        return settings.theme;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Determine effective theme
  const effectiveTheme: Theme = (() => {
    const serverTheme = serverQuery.data;

    if (serverTheme?.sync) {
      // Server sync enabled: use server theme
      return { base: serverTheme.base, color: serverTheme.color };
    } else {
      // Server sync disabled or no server theme: use local theme
      return { base: localBase, color: localColor };
    }
  })();

  useEffect(() => {
    if (serverQuery.data?.sync && (localBase !== serverQuery.data.base || localColor !== serverQuery.data.color)) {
      setBase(serverQuery.data.base);
      setColor(serverQuery.data.color);
    }
  }, [serverQuery.data, localBase, localColor, setColor, setBase]);

  const base = effectiveTheme.base;
  const color = effectiveTheme.color;

  useEffect(() => {
    const root = window.document.documentElement;

    root.className = "";

    if (base === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "mocha" : "latte";

      root.classList.add(...`${systemTheme} ctp-theme accent-mauve`.split(" "));
      return;
    }

    const clsList: string[] = [base, `accent-${color}`];
    if (base !== "white" && base !== "dark") {
      clsList.push("ctp-theme");
    }

    root.classList.add(...clsList);
  }, [base, color]);

  return <>{children}</>;
}

export type { Theme } from "@/../../server/src/db/settings.schema";