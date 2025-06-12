import { z } from "zod/v4-mini";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UseModelState = {
  model: Model;
  setModel: (model: Model) => void;
};

export const useModel = create<UseModelState>()(
  persist(
    (set) => ({
      model: { name: "GPT 4.1", id: "openai/gpt-4.1", thinking: false },
      setModel: (model: Model) => set({ model }),
    }),
    {
      name: "model-storage",
    }
  )
);
export const Model = z.object({
  name: z.string(),
  id: z.string(),
  thinking: z.boolean(),
  thinkingEffort: z.optional(z.enum(["low", "medium", "high"])),
});
export type Model = z.infer<typeof Model>;
export const Models = z.record(z.string(), Model);
export type Models = z.infer<typeof Models>;
