import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast } from 'sonner'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toastEnterAPIKey(reason: 'missing' | 'invalid' = 'missing', openModal?: () => void) {
  if (reason === 'invalid') {
    toast.error("Invalid OpenRouter Key.", {
      action: openModal ? {
        label: "Re-Enter Key",
        onClick: openModal,
      } : undefined,
    });
  } else if (reason === 'missing') {
    toast.error("Please set your OpenRouter Key first.", {
      action: openModal ? {
        label: "Enter Key",
        onClick: openModal,
      } : undefined,
    });
  } else {
    throw new Error(`Invalid reason: ${reason}`);
  }
}
