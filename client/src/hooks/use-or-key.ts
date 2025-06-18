import { create } from "zustand";
import { persist } from "zustand/middleware";

type ORKeyState = {
  key: string | null;
  setKey: (key: string | null) => void;
};

export const useORKey = create<ORKeyState>()(
  persist(
    (set) => ({
      key: null,
      setKey: (key: string | null) => set({ key }),
    }),
    {
      name: "sk-or",
    },
  ),
);
