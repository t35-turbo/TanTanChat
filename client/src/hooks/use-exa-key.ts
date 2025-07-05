import { create } from "zustand";
import { persist } from "zustand/middleware";

// Persistent store to manage the Exa Search API key
export type ExaKeyState = {
    key: string | null;
    setKey: (key: string | null) => void;
};

export const useExaKey = create<ExaKeyState>()(
    persist(
        (set) => ({
            key: null,
            setKey: (key: string | null) => set({ key }),
        }),
        {
            name: "exa-api-key", // localStorage key
        },
    ),
); 