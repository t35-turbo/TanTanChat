import { create } from "zustand";

type KeyInputState = {
  isOpen: boolean;
  open: () => void;
  toggle: (arg0?: boolean) => void;
  close: () => void;
};

export const useKeyInput = create<KeyInputState>((set, get) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  toggle: (arg0) => {
    if (arg0 !== undefined) set({ isOpen: arg0 });
    else set({ isOpen: !get().isOpen });
  },
  close: () => set({ isOpen: false }),
}));
