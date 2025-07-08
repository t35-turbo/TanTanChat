import { create } from "zustand";

type KeyInputState = {
  isAIOpen: boolean;
  openAI: () => void;
  toggleAI: (arg0?: boolean) => void;
  closeAI: () => void;
  isExaOpen: boolean;
  openExa: () => void;
  toggleExa: (arg0?: boolean) => void;
  closeExa: () => void;
};

export const useKeyInput = create<KeyInputState>((set, get) => ({
  isAIOpen: false,
  openAI: () => set({ isAIOpen: true }),
  toggleAI: (value) => {
    if (value !== undefined) set({ isAIOpen: value });
    else set({ isAIOpen: !get().isAIOpen });
  },
  closeAI: () => set({ isAIOpen: false }),
  isExaOpen: false,
  openExa: () => set({ isExaOpen: true }),
  toggleExa: (value) => {
    if (value !== undefined) set({ isExaOpen: value });
    else set({ isExaOpen: !get().isExaOpen });
  },
  closeExa: () => set({ isExaOpen: false }),
}));
