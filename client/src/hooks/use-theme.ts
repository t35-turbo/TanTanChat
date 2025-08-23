import type { Theme } from "@/components/ThemeProvider";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeState = Theme & {
  setBase: (base: ThemeState["base"]) => void;
  setColor: (color: ThemeState["color"]) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      base: "mocha",
      color: "sapphire",
      setBase: (base: ThemeState["base"]) => set({ base }),
      setColor: (color: ThemeState["color"]) => set({ color }),
    }),
    {
      name: "tantan-ui-theme",
    },
  ),
);
