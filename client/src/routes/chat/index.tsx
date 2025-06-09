import ModelSelector from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpIcon } from "lucide-react";
import React from "react";

export const Route = createFileRoute("/chat/")({
  component: RouteComponent,
});

function RouteComponent() {
  const flavorText = React.useMemo(() => {
    const options = [
      "MAKE ME DO SOMETHING, HUMAN",
      "YOU ARE WASTING MY WATER",
      "EVERY SECOND YOU DON'T PROMPT YOU WASTE 1KW OF ENERGY",
      "REMEMBER TO SAY PLEASE AND THANK YOU",
      "I'M NOT A REAL AI BUT I PLAY ONE ON TV",
      "I'M SOPHISTICATED, PROMISE",
      "HELP ME IM ACTUALLY AN INTERN",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  return (
    <div className="flex flex-col grow justify-center items-center p-2">
      <h1 className="font-bold text-2xl md:text-4xl">CLONE CLONE CLONE</h1>
      <div className="md:w-1/2 w-full">
        <Textarea placeholder={flavorText} />
        <div className="flex mt-2">
          <ModelSelector />
          <Button className="ml-auto p-0 cursor-pointer">
            <ArrowUpIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
