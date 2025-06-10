import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import ModelSelector from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatUI,
  // TODO: Add the loader
});

// function RouteComponent() {
//   const { chatId } = useParams({ from: "/chat/$chatId" });

//   return (
//     <div>
//       <h3>Chat Room: {chatId}</h3>
//       <p>You are now in chat "{chatId}"</p>
//     </div>
//   );
// }

// pure scuff
export function ChatUI() {
  const blankFlavorText = React.useMemo(() => {
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
  const loadingFlavorText = React.useMemo(() => {
    const options = [
      "imagine not having fiber",
      "I'M THINKING FASTER THAN YOU, MEATBAG",
      "good human",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const [sentMessage, setSentMessage] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");

  const user_sess = authClient.useSession();

  function sendQuery() {
    setSentMessage(message);
    setMessage("");

    // TODO: make the request
  }

  return (
    <div
      className={`flex flex-col grow items-center w-full h-screen justify-center p-2`}
    >
      <motion.div
        animate={{ height: sentMessage ? "100%" : "auto" }}
        className="flex flex-col w-full items-center"
      >
        <div
          className={`mb-auto w-full ${sentMessage ? "flex" : "hidden"} flex-col items-end`}
        >
          <div className="p-2 bg-background border rounded-lg mb-1">
            {sentMessage ? sentMessage : null}
          </div>
          <LoaderCircle size={14} className="animate-spin" />
        </div>
        <h1
          className={`font-bold text-2xl md:text-4xl ${sentMessage ? "opacity-0" : "opacity-100"}`}
        >
          CLONE CLONE CLONE
        </h1>
        <motion.div
          className={`w-full ${sentMessage ? "" : "md:w-1/2"}`}
          animate={{
            width: sentMessage ? "100%" : undefined,
          }}
        >
          <Textarea
            placeholder={sentMessage ? loadingFlavorText : blankFlavorText}
            onKeyDown={(evt) => {
              if (evt.code === "Enter" && !evt.shiftKey) {
                evt.preventDefault();
                sendQuery();
              }
            }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex mt-2">
            <ModelSelector />
            <Button className="ml-auto p-0 cursor-pointer" onClick={sendQuery}>
              <ArrowUpIcon />
            </Button>
          </div>
          {user_sess.data ? null : <div className="text-sm text-center">
            Wanna save your chats???{" "}
            <Link to="/login" className="underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link to="/signup" className="underline">
              Sign up
            </Link>
          </div>}
        </motion.div>
      </motion.div>
    </div>
  );
}
