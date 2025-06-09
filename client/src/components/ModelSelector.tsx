import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { ChevronDownIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { useORKey } from "@/hooks/use-or-key";
import { toast } from "sonner";
import { useKeyInput } from "@/hooks/use-key-input";

export const defaultModels = [
  "google/gemini-2.5-pro-preview",
  "google/gemini-2.5-flash-preview",
  "google/gemini-2.5-flash-preview:thinking",
  "openai/gpt-4.1",
  "openai/o4-mini",
];

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const or_key = useORKey((state) => state.key);
  const openModal = useKeyInput(state => state.open);

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        if (!or_key) {
          toast.error("Please set your OpenRouter Key first.", {
            action: {
              label: "Enter Key",
              onClick: openModal
            }
          });
        } else if (!or_key.startsWith("sk-or")) {
          toast.error("Invalid OpenRouter Key.", {
            action: {
              label: "Re-Enter Key",
              onClick: openModal
            }
          });
        } else {
          setOpen(open);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant={"outline"} role="combobox" aria-expanded={open}>
          {value ? value : "Select Model..."}

          <ChevronDownIcon className="ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Enter the OpenRouter Model ID..." />
          <CommandList>
            <CommandEmpty>Custom Openrouter Model...</CommandEmpty>

            <CommandGroup>
              {defaultModels.map((model) => (
                <CommandItem
                  key={model}
                  value={model}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    setOpen(false);
                  }}
                >
                  {model}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
