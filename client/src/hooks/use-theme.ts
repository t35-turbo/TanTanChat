import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
  base: "white" | "latte" | "frappe" | "macchiato" | "mocha" | "dark" | "system";
  color:
    | "rosewater"
    | "flamingo"
    | "pink"
    | "mauve"
    | "red"
    | "maroon"
    | "peach"
    | "yellow"
    | "green"
    | "teal"
    | "sky"
    | "sapphire"
    | "blue"
    | "lavender";
  setBase: (base: ThemeState["base"]) => void;
  setColor: (color: ThemeState["color"]) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      base: "mocha",
      color: "mauve",
      setBase: (base: ThemeState["base"]) => set({ base }),
      setColor: (color: ThemeState["color"]) => set({ color }),
    }),
    {
      name: "tantan-ui-theme",
    },
  ),
);
