import type { Theme } from "@/../../src/db/settings.schema";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

const baseThemes = [
  {
    value: "white" as const,
    label: "White",
    color: "bg-white hover:border-4 hover:bg-white dark:bg-white",
  },
  {
    value: "latte" as const,
    label: "Latte",
    color: "dark:bg-[#eff1f5] bg-[#eff1f5] hover:border-4",
  },
  {
    value: "frappe" as const,
    label: "Frappe",
    color: "bg-[#303446] hover:border-4 dark:bg-[#303446]",
  },
  {
    value: "macchiato" as const,
    label: "Macchiato",
    color: "bg-[#24273a] hover:border-4 dark:bg-[#24273a]",
  },
  {
    value: "mocha" as const,
    label: "Mocha",
    color: "bg-[#1e1e2e] hover:border-4 dark:bg-[#1e1e2e]",
  },
  {
    value: "dark" as const,
    label: "Dark",
    color: "bg-black hover:bg-black",
  },
];

const accentColors = [
  { value: "rosewater" as const, className: "accent-rosewater" },
  { value: "flamingo" as const, className: "accent-flamingo" },
  { value: "pink" as const, className: "accent-pink" },
  { value: "mauve" as const, className: "accent-mauve" },
  { value: "red" as const, className: "accent-red" },
  { value: "maroon" as const, className: "accent-maroon" },
  { value: "yellow" as const, className: "accent-yellow" },
  { value: "green" as const, className: "accent-green" },
  { value: "teal" as const, className: "accent-teal" },
  { value: "sky" as const, className: "accent-sky" },
  { value: "sapphire" as const, className: "accent-sapphire" },
  { value: "blue" as const, className: "accent-blue" },
  { value: "lavender" as const, className: "accent-lavender" },
];

export function ThemeSelector({
  base,
  color,
  onBaseChange,
  onColorChange,
}: {
  base?: Theme["base"];
  color?: Theme["color"];
  onBaseChange?: (base: Theme["base"]) => void;
  onColorChange?: (color: Theme["color"]) => void;
}) {
  const [intBase, setIntBase] = useState<Theme["base"]>("mocha");
  const [intColor, setIntColor] = useState<Theme["color"]>("sapphire");
  const realBase = base ?? intBase;
  const realColor = color ?? intColor;
  const setBase = (base: Theme["base"]) => {
    setIntBase(base);
    onBaseChange?.(base);
  };

  const setColor = (color: Theme["color"]) => {
    setIntColor(color);
    onColorChange?.(color);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p>Base Theme</p>
        <div className="flex flex-wrap gap-2">
          {baseThemes.map((theme) => (
            <Tooltip key={theme.value}>
              <TooltipTrigger asChild>
                <Button
                  className={`h-12 w-12 rounded-full ${theme.color} ${realBase === theme.value ? "border-accent border-4" : ""}`}
                  variant="outline"
                  onClick={() => setBase(theme.value)}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{theme.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {realBase !== "white" && realBase !== "dark" && (
          <>
            <p>Accent Color</p>
            <div className="flex flex-wrap gap-2">
              {accentColors.map((accent) => (
                <Tooltip key={accent.value}>
                  <TooltipTrigger asChild>
                    <Button
                      className={`${accent.className} h-12 w-12 rounded-full bg-[rgba(var(--ctp-accent))] hover:border-4 hover:bg-[rgba(var(--ctp-accent))] ${realColor === accent.value ? "border-accent border-4" : ""}`}
                      variant="outline"
                      onClick={() => setColor(accent.value)}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{accent.value.charAt(0).toUpperCase() + accent.value.slice(1)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
