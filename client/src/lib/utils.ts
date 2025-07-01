import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast } from 'sonner'
import { useKeyInput } from '@/hooks/use-key-input'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toastEnterAPIKey(reason: 'missing' | 'invalid' = 'missing') {
  const openModal = useKeyInput(state => state.open);

  if (reason === 'invalid') {
    toast.error("Invalid OpenRouter Key.", {
      action: {
        label: "Re-Enter Key",
        onClick: openModal,
      },
    });
  } else if (reason === 'missing') {
    toast.error("Please set your OpenRouter Key first.", {
      action: {
        label: "Enter Key",
        onClick: openModal,
      },
    });
  } else {
    throw new Error(`Invalid reason: ${reason}`);
  }
}
