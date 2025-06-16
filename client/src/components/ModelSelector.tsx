import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { ChevronDownIcon } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { useORKey } from "@/hooks/use-or-key";
import { toast } from "sonner";
import { useKeyInput } from "@/hooks/use-key-input";
import { type Models, useModel } from "@/hooks/use-model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const defaultModels: Models = {
  "google/gemini-2.5-pro-preview": { name: "Gemini 2.5 Pro", id: "google/gemini-2.5-pro-preview", thinking: false },
  "google/gemini-2.5-flash-preview": {
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash-preview",
    thinking: false,
  },
  "google/gemini-2.5-flash-preview:thinking": {
    name: "Gemini 2.5 Flash (Thinking)",
    id: "google/gemini-2.5-flash-preview:thinking",
    thinking: true,
    thinkingEffort: "medium",
  },
  "openai/gpt-4.1-nano-2025-04-14": {
    name: "GPT-4.1 Nano",
    id: "openai/gpt-4.1-nano-2025-04-14",
    thinking: false,}, 
  "openai/gpt-4.1-mini": {
    name: "GPT-4.1 mini",
    id: "openai/gpt-4.1-mini",
    thinking: false}, 
  "openai/gpt-4.1": { name: "GPT-4.1", id: "openai/gpt-4.1", thinking: false },
  "openai/o4-mini": { name: "o4 Mini", id: "openai/o4-mini", thinking: true, thinkingEffort: "medium" },
  "anthropic/claude-sonnet-4": {
    name: "Claude Sonnet 4",
    id: "anthropic/claude-sonnet-4",
    thinking: true,
    thinkingEffort: "low",
  },
  "deepseek/deepseek-r1-0528-qwen3-8b:free": {
    name: "Deepseek R1 Qwen3 8B (Free)",
    id: "deepseek/deepseek-r1-0528-qwen3-8b:free",
    thinking: true,
    thinkingEffort: "medium",
  },
  "deepseek/deepseek-r1-0528:free": {
    name: "Deepseek R1 (Free)",
    id: "deepseek/deepseek-r1-0528:free",
    thinking: true,
    thinkingEffort: "medium",
  },
  "deepseek/deepseek-r1-0528": {
    name: "Deepseek R1",
    id: "deepseek/deepseek-r1-0528",
    thinking: true,
    thinkingEffort: "medium",
  },
  "qwen/qwq-32b:free": {
    name: "Qwen QWQ-32B (Free)",
    id: "qwen/qwq-32b:free",
    thinking: true,
    thinkingEffort: "high",
  }
};

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const model = useModel((state) => state.model);
  const setModel = useModel((state) => state.setModel);

  const or_key = useORKey((state) => state.key);
  const openModal = useKeyInput((state) => state.open);

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(open) => {
          if (!or_key) {
            toast.error("Please set your OpenRouter Key first.", {
              action: {
                label: "Enter Key",
                onClick: openModal,
              },
            });
          } else if (!or_key.startsWith("sk-or")) {
            toast.error("Invalid OpenRouter Key.", {
              action: {
                label: "Re-Enter Key",
                onClick: openModal,
              },
            });
          } else {
            setOpen(open);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant={"outline"} className="w-64 justify-between" role="combobox" aria-expanded={open}>
            <span className="truncate">{model ? model.name : "Select Model..."}</span>

            <ChevronDownIcon className="ml-2 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0">
          <Command>
            <CommandInput placeholder="Enter the OpenRouter Model ID..." />
            <CommandList>
              <CommandEmpty>Custom Openrouter Model...</CommandEmpty>

              <CommandGroup>
                {Object.values(defaultModels).map(({ id, name }) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={(currentValue) => {
                      setModel(defaultModels[currentValue]);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {model.thinking ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={"outline"} className="w-32 justify-between ml-2" role="combobox" aria-expanded={open}>
              <span className="truncate">
                {model.thinkingEffort
                  ? model.thinkingEffort.slice(0, 1).toUpperCase() + model.thinkingEffort.slice(1)
                  : "Medium"}
              </span>

              <ChevronDownIcon className="ml-2 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={model.thinkingEffort}
              onValueChange={(eff) => setModel({ ...model, thinkingEffort: eff as "low" | "medium" | "high" })}
            >
              <DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </>
  );
}
