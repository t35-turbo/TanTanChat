import { create } from "zustand";

type ToolsState = {
  web_search: boolean;
  setWebSearch: (webSearch: boolean) => void;
};

export const useTools = create<ToolsState>(set => ({
  web_search: false,
  setWebSearch: (webSearch: boolean) => set({ web_search: webSearch }),
}))