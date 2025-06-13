import { create } from "zustand";
import { persist } from "zustand/middleware";

type SystemPromptState = {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
};

export const useSystemPrompt = create<SystemPromptState>()(
  persist(
    (set) => ({
      systemPrompt: "",
      setSystemPrompt: (systemPrompt: string) => set({ systemPrompt }),
    }),
    {
      name: "system-prompt",
    },
  ),
);
