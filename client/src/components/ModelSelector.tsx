import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { ChevronDownIcon, Paperclip } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { useORKey } from "@/hooks/use-or-key";
import { toast } from "sonner";
import { useKeyInput } from "@/hooks/use-key-input";
import { type Models, useModel } from "@/hooks/use-model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toggle } from "./ui/toggle";
import { Label } from "./ui/label";
import { useFiles } from "@/hooks/use-files";
// import { Toggle } from "./ui/toggle";
// import { useTools } from "@/hooks/use-tools";

export const defaultModels: Models = {
  "google/gemini-2.5-pro-preview": {
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro-preview",
    thinking: false,
    vision: true,
  },
  "google/gemini-2.5-flash-preview": {
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash-preview",
    thinking: false,
    vision: true,
  },
  "google/gemini-2.5-flash-preview:thinking": {
    name: "Gemini 2.5 Flash (Thinking)",
    id: "google/gemini-2.5-flash-preview:thinking",
    thinking: true,
    thinkingEffort: "medium",
    vision: true,
  },
  "openai/gpt-4.1-nano-2025-04-14": {
    name: "GPT-4.1 Nano",
    id: "openai/gpt-4.1-nano-2025-04-14",
    thinking: false,
    vision: false,
  },
  "openai/gpt-4.1-mini": {
    name: "GPT-4.1 mini",
    id: "openai/gpt-4.1-mini",
    thinking: false,
    vision: true,
  },
  "openai/gpt-4.1": { name: "GPT-4.1", id: "openai/gpt-4.1", thinking: false, vision: true },
  "openai/o4-mini": { name: "o4 Mini", id: "openai/o4-mini", thinking: true, thinkingEffort: "medium", vision: true },
  "anthropic/claude-sonnet-4": {
    name: "Claude Sonnet 4",
    id: "anthropic/claude-sonnet-4",
    thinking: true,
    thinkingEffort: "low",
    vision: true,
  },
  "deepseek/deepseek-r1-0528-qwen3-8b:free": {
    name: "Deepseek R1 Qwen3 8B (Free)",
    id: "deepseek/deepseek-r1-0528-qwen3-8b:free",
    thinking: true,
    thinkingEffort: "medium",
    vision: false,
  },
  "deepseek/deepseek-r1-0528:free": {
    name: "Deepseek R1 (Free)",
    id: "deepseek/deepseek-r1-0528:free",
    thinking: true,
    thinkingEffort: "medium",
    vision: false,
  },
  "deepseek/deepseek-r1-0528": {
    name: "Deepseek R1",
    id: "deepseek/deepseek-r1-0528",
    thinking: true,
    thinkingEffort: "medium",
    vision: false,
  },
  "qwen/qwq-32b:free": {
    name: "Qwen QWQ-32B (Free)",
    id: "qwen/qwq-32b:free",
    thinking: true,
    thinkingEffort: "high",
    vision: false,
  },
};

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const model = useModel((state) => state.model);
  const setModel = useModel((state) => state.setModel);

  // const webSearch = useTools(state => state.web_search);
  // const setWebSearch = useTools(state => state.setWebSearch);

  const or_key = useORKey((state) => state.key);
  const openModal = useKeyInput((state) => state.open);

  const files = useFiles((state) => state.files);
  const addFiles = useFiles((state) => state.addFiles);

  function handleNewFiles(evt: React.ChangeEvent<HTMLInputElement>) {
    if (evt.target.files) {
      if (files.length + (evt.target.files?.length || 0) > 10) {
        toast.error("You can only upload up to a max of 10 files.");
      }

      for (const file of evt.target.files) {
        if (file.size < 30_000_000) {
          addFiles([
            {
              id: "pending",
              name: file.name,
              file: file,
              uploaded: false,
            },
          ]);
        } else {
          toast.error(`Only uploads up to 30MB are supported. File ${file.name} is oversize.`);
        }
      }
    }
  }

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
          <Button variant={"outline"} className="max-w-48 justify-between" role="combobox" aria-expanded={open}>
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
            <Button variant={"outline"} className="max-w-32 justify-between" role="combobox" aria-expanded={open}>
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
      <Button variant={"ghost"} asChild>
        <Label htmlFor="attachments">
          <Paperclip /> Attach
        </Label>
      </Button>
      <input
        type="file"
        name="attachments"
        id="attachments"
        className="hidden"
        // the fuck???
        accept={`.txt,.js,.jsx,.ts,.tsx,.json,.md,.yaml,.yml,.xml,.html,.css,.csv,.log,.py,.java,.cpp,.c,.h,.php,.rb,.go,.rs,.sh,.bat,.sql,.ini,.cfg,.conf,.env,.gitignore,.dockerfile,text/*,application/pdf${model?.vision ? ",image/png,image/jpeg,image/webp" : ""}`}
        onChange={handleNewFiles}
        multiple
      />

      {/* <Toggle className="border" onPressedChange={setWebSearch} pressed={webSearch}><Globe /> Search</Toggle> */}
    </>
  );
}
