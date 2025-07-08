import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast } from 'sonner'
import { useKeyInput } from '@/hooks/use-key-input'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toastEnterAPIKey(reason: 'missing' | 'invalid' = 'missing') {
  const openModal = useKeyInput(state => state.openAI);

  if (reason === 'invalid') {
    toast.error("Invalid OpenRouter Key.", {
      action: {
        label: "Re-Enter Key",
        onClick: openModal,
      },
    });
  } else if (reason === 'missing') {
    toast.error("Please set your AI API Key first.", {
      action: {
        label: "Enter Key",
        onClick: openModal,
      },
    });
  } else {
    throw new Error(`Invalid reason: ${reason}`);
  }
}

export function toastEnterExaAPIKey() {
  const openModal = useKeyInput(state => state.openExa);

  toast.error("Please set your Exa Search API Key first.", {
    action: {
      label: "Enter Key",
      onClick: openModal,
    },
  });
}
