import { create } from "zustand";
import { persist } from "zustand/middleware";

type ORKeyState = {
  key: string | null;
  setKey: (key: string) => void;
};

export const useORKey = create<ORKeyState>()(
  persist(
    (set) => ({
      key: null,
      setKey: (key: string) => set({ key }),
    }),
    {
      name: "sk-or",
    },
  ),
);
