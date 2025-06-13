import { useTheme } from "@/hooks/use-theme";
import { createContext, useContext, useEffect } from "react";

type Theme = "dark" | "light" | "mocha" | "system" | "latte" | "frappe" | "macchiato";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const base = useTheme((state) => state.base);
  const color = useTheme(state => state.color);

  useEffect(() => {
    const root = window.document.documentElement;

    root.className = "";

    if (base === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "mocha" : "latte";

      root.classList.add(...`${systemTheme} ctp-theme accent-mauve`.split(" "));
      return;
    }

    let clsList: string[] = [base, color]
    if (base !== "white" && base !== "dark") {
      clsList.push("ctp-theme");
    }

    root.classList.add(...clsList);
  }, [base, color]);

  return (
    <>
      {children}
    </>
  );
}