import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, LoaderCircle, SquareIcon } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import ModelSelector from "@/components/ModelSelector";
import FileDisplay from "@/components/FileDisplay";
import { useFiles, type FileItem } from "@/hooks/use-files";
import { useActiveId } from "./WSManager";

interface MessageInputProps {
  chatId?: string;
  sendMessage: (message: string) => void;
  isPending: boolean;
  pendingVariables?: string;
}

export default function MessageInput({
  chatId,
  sendMessage,
  isPending,
  pendingVariables,
}: MessageInputProps) {
  const [input, setInput] = React.useState("");
  const files = useFiles((state) => state.files);
  const addFiles = useFiles((state) => state.addFiles);

  const activeId = useActiveId();

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

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const files = Array.from(clipboardData.files);
    const items = Array.from(clipboardData.items);

    const newFiles: FileItem[] = [];

    // Prioritize direct files first
    if (files.length > 0) {
      files.forEach((file) => {
        // Check if it's a generic pasted image name and replace with timestamp
        let fileName = file.name;
        if (fileName === 'image.png' || fileName === 'image.jpg' || fileName === 'image.jpeg' || fileName === 'image.webp' || fileName === 'image.gif') {
          const extension = file.type.split('/')[1] || fileName.split('.').pop() || 'png';
          fileName = `pasted-image-${(new Date()).toLocaleTimeString()}.${extension}`;
        } else if (!fileName) {
          fileName = `pasted-file-${(new Date()).toLocaleTimeString()}`;
        }

        const fileItem: FileItem = {
          id: crypto.randomUUID(),
          name: fileName,
          file: file,
          uploaded: false,
        };
        newFiles.push(fileItem);
      });
    } else {
      // Only process clipboard items if no direct files found
      items.forEach((item) => {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const extension = item.type.split('/')[1] || 'png';
            const fileItem: FileItem = {
              id: crypto.randomUUID(),
              name: `pasted-image-${Date.now()}.${extension}`,
              file: file,
              uploaded: false,
            };
            newFiles.push(fileItem);
          }
        }
      });
    }

    if (newFiles.length > 0) {
      event.preventDefault();
      addFiles(newFiles);
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
      className={`w-full ${chatId ? "" : "md:w-1/2"} p-2 sticky bottom-0 bg-background`}
      animate={animateProps}
      transition={transitionProps}
    >
      {isPending || activeId ? (
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
        onPaste={handlePaste}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex mt-2 gap-1">
        <ModelSelector />

        <Button
          className="ml-auto p-0 cursor-pointer"
          onClick={handleSendMessage}
          disabled={
            !!activeId ||
            input.trim() === "" ||
            files.reduce((prev, cur) => (prev ? prev : !cur.uploaded), false)
          }
        >
          {!activeId ? <ArrowUpIcon /> : <SquareIcon className="fill-background" />}
        </Button>
      </div>
    </motion.div>
  );
}
