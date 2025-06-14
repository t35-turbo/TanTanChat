import { useTheme } from "@/hooks/use-theme";
import { useEffect } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const base = useTheme((state) => state.base);
  const color = useTheme((state) => state.color);

  useEffect(() => {
    const root = window.document.documentElement;

    root.className = "";

    if (base === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "mocha" : "latte";

      root.classList.add(...`${systemTheme} ctp-theme accent-mauve`.split(" "));
      return;
    }

    let clsList: string[] = [base, `accent-${color}`];
    if (base !== "white" && base !== "dark") {
      clsList.push("ctp-theme");
    }

    root.classList.add(...clsList);
  }, [base, color]);

  return <>{children}</>;
}
