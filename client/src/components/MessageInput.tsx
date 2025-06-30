import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, LoaderCircle, SquareIcon } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import ModelSelector from "@/components/ModelSelector";
import FileDisplay from "@/components/FileDisplay";
import { useFiles } from "@/hooks/use-files";

interface MessageInputProps {
  chatId?: string;
  sendMessage: (message: string) => void;
  isPending: boolean;
  activeMessageId: string | null;
  pendingVariables?: string;
}

export default function MessageInput({
  chatId,
  sendMessage,
  isPending,
  activeMessageId,
  pendingVariables,
}: MessageInputProps) {
  const [input, setInput] = React.useState("");
  const files = useFiles((state) => state.files);

  const blankFlavorText = React.useMemo(() => {
    const options = [
      "Powered by a network of 700 bioneural networks",
      "You are wasting my water.",
      "Every second you don't prompt, a second goes by.",
      "Remember to say please and thank you!",
      "I'M NOT A REAL AI BUT I PLAY ONE ON TV",
      "I'M SOPHISTICATED, PROMISE",
      "HELP ME IM ACTUALLY AN INTERN",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const loadingFlavorText = React.useMemo(() => {
    const options = [
      "Our Bioneural Networks are busy at work",
      "nice prompt bro",
      "Remember to say thank you!",
      "If you say please i'll be more helpful",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const handleSendMessage = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  const animateProps = React.useMemo(
    () => ({ width: chatId ? "100%" : undefined }),
    [chatId]
  );
  const transitionProps = React.useMemo(
    () => ({ duration: 0.2 }),
    []
  );
  return (
    <motion.div
      className={`w-full ${chatId ? "" : "md:w-1/2"} sticky bottom-0 bg-background`}
      animate={animateProps}
      transition={transitionProps}
    >
      {isPending || activeMessageId ? (
        <div
          className={`w-full ${chatId ? "flex" : "hidden"} justify-end p-2 ${isPending ? "items-end" : "items-start"}`}
          key={pendingVariables}
        >
          <LoaderCircle className="animate-spin size-4" />
        </div>
      ) : null}
      <FileDisplay />
      <Textarea
        placeholder={chatId ? loadingFlavorText : blankFlavorText}
        onKeyDown={(evt) => {
          if (evt.code === "Enter" && !evt.shiftKey) {
            evt.preventDefault();
            handleSendMessage();
          }
        }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex mt-2 gap-1">
        <ModelSelector />

        <Button
          className="ml-auto p-0 cursor-pointer"
          onClick={handleSendMessage}
          disabled={
            !!activeMessageId ||
            input.trim() === "" ||
            files.reduce((prev, cur) => (prev ? prev : !cur.uploaded), false)
          }
        >
          {!activeMessageId ? <ArrowUpIcon /> : <SquareIcon className="fill-background" />}
        </Button>
      </div>
    </motion.div>
  );
}