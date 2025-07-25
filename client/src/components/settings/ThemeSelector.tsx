import { useState } from "react";
import type { Theme } from "@/../../src/db/settings.schema";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`rounded-full w-12 h-12 bg-white hover:bg-white dark:bg-white hover:border-4 ${realBase === "white" ? "border-accent border-4" : ""}`}
                variant="outline"
                onClick={() => setBase("white")}
              ></Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>White</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`rounded-full w-12 h-12 bg-[#eff1f5] dark:bg[#eff1f5] hover:border-4 ${realBase === "latte" ? "border-accent border-4" : ""}`}
                variant="outline"
                onClick={() => setBase("latte")}
              ></Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Latte</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`rounded-full w-12 h-12 bg-[#303446] dark:bg-[#303446] hover:border-4 ${realBase === "frappe" ? "border-accent border-4" : ""}`}
                variant="outline"
                onClick={() => setBase("frappe")}
              ></Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Frappe</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`rounded-full w-12 h-12 bg-[#24273a] dark:bg-[#24273a] hover:border-4 ${realBase === "macchiato" ? "border-accent border-4" : ""}`}
                variant="outline"
                onClick={() => setBase("macchiato")}
              ></Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Macchiato</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`rounded-full w-12 h-12 bg-[#1e1e2e] dark:bg-[#1e1e2e] hover:border-4 ${realBase === "mocha" ? "border-accent border-4" : ""}`}
                variant="outline"
                onClick={() => setBase("mocha")}
              ></Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mocha</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`rounded-full w-12 h-12 bg-black hover:bg-black ${realBase === "dark" ? "border-accent border-4" : ""}`}
                variant="outline"
                onClick={() => setBase("dark")}
              ></Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Dark</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {realBase !== "white" && realBase !== "dark" && (
          <>
            <p>Accent Color</p>
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-rosewater rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "rosewater" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("rosewater")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rosewater</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-flamingo rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "flamingo" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("flamingo")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Flamingo</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-pink rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "pink" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("pink")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pink</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-mauve rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "mauve" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("mauve")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mauve</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-red rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "red" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("red")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Red</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-maroon rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "maroon" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("maroon")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maroon</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-yellow rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "yellow" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("yellow")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Yellow</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-green rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "green" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("green")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Green</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-teal rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "teal" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("teal")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Teal</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-sky rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "sky" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("sky")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sky</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-sapphire rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "sapphire" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("sapphire")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sapphire</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-blue rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "blue" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("blue")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Blue</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={`accent-lavender rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${realColor === "lavender" ? "border-accent border-4" : ""}`}
                    variant="outline"
                    onClick={() => setColor("lavender")}
                  ></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Lavender</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
