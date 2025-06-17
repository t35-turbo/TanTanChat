import { create } from "zustand";

type ToolsState = {
  webSearch: boolean;
  setWebSearch: (webSearch: boolean) => void;
};

export const useTools = create<ToolsState>(set => ({
  webSearch: false,
  setWebSearch: (webSearch: boolean) => set({ webSearch }),
}))