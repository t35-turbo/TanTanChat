import { create } from "zustand";
import { persist } from "zustand/middleware";

type ToolsState = {
  web_search: boolean;
  setWebSearch: (webSearch: boolean) => void;
};

export const useTools = create<ToolsState>()(
  persist(
    (set) => ({
      web_search: false,
      setWebSearch: (webSearch: boolean) => set({ web_search: webSearch }),
    }),
    {
      name: "tools-state",
    },
  ),
);