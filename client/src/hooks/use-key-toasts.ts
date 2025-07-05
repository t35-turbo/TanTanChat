import { toast } from "sonner";
import { useKeyInput } from "@/hooks/use-key-input";

/**
 * Provides toast helper functions that already have access to the relevant
 * `openModal` callbacks from `useKeyInput`. This avoids the need to call hooks
 * inside event handlers or utility functions and keeps the Rules of Hooks
 * intact.
 */
export function useKeyToasts() {
    const openAIModal = useKeyInput((state) => state.openAI);
    const openExaModal = useKeyInput((state) => state.openExa);

    const toastEnterAPIKey = (reason: "missing" | "invalid" = "missing") => {
        if (reason === "invalid") {
            toast.error("Invalid OpenRouter Key.", {
                action: {
                    label: "Re-Enter Key",
                    onClick: openAIModal,
                },
            });
        } else {
            toast.error("Please set your AI API Key first.", {
                action: {
                    label: "Enter Key",
                    onClick: openAIModal,
                },
            });
        }
    };

    const toastEnterExaAPIKey = () => {
        toast.error("Please set your Exa Search API Key first.", {
            action: {
                label: "Enter Key",
                onClick: openExaModal,
            },
        });
    };

    return {
        toastEnterAPIKey,
        toastEnterExaAPIKey,
    } as const;
} 