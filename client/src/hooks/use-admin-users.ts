import { create } from "zustand";
import { persist } from "zustand/middleware";

type PagesState = {
  pageLimit: number;
  setPageLimit: (size: number) => void;
};

export const useSettings = create<PagesState>()(
  persist(
    (set) => ({
      pageLimit: 25,
      setPageLimit: (pages: number) => set({ pageLimit: pages }),
    }),
    {
      name: "pages-storage",
    },
  ),
);
