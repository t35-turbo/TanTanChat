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
      setKey: (key: string | null) => set({ key: key?.trim() ?? null }),
    }),
    {
      name: "sk-or",
    },
  ),
);
