import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import ModelSelector from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import { authClient } from "@/lib/auth-client";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/routes/__root";
import { z } from "zod/v4-mini";
import ky, { HTTPError } from "ky";
import { db, Message } from "@/lib/db";
import { toast } from "sonner";

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

// TODO: when the new chat is created, the input ui loses focus
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
      "HELP ME IM ACTUALLY AN INTERN (AI)",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }, []);
  const loadingFlavorText = React.useMemo(() => {
    const options = ["imagine not having fiber", "I'M THINKING FASTER THAN YOU, MEATBAG", "good human"];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const navigate = useNavigate();
  const user_sess = authClient.useSession();

  const { chatId } = useParams({
    from: "/chat/$chatId",
    shouldThrow: false,
  }) ?? { chatId: undefined };

  const [input, setInput] = React.useState("");
  // TODO: implement scroll
  const messagePages = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam: cursor }) => {
      if (chatId) {
        // TODO: get messages
        if (user_sess.data) {
          let messageResponse;
          try {
            messageResponse = await ky.get(`/api/chats/${chatId}?cursor=${cursor}`);
          } catch (err: any) {
            if (err instanceof HTTPError && err.response.status === 404) {
              toast.error("Chat not found");
              navigate({ to: "/chat" });
            } else {
              throw err;
            }
          }
          if (!messageResponse) {
            throw new Error("Failed to fetch messages");
          }
          let messages = await messageResponse.json();
          return z.object({ messages: z.array(Message), cursor: z.number() }).parse(messages);
        } else {
          let chat = await db.chats.get(chatId);
          if (!chat) {
            toast.error("Chat not found");
            navigate({ to: "/chat" });
          }
          return { messages: z.array(Message).parse(chat), cursor: cursor };
        }
      } else {
        return { messages: [], cursor: 0 };
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.cursor + 1,
    enabled: !user_sess.isPending,
  });

  const sendMessage = useMutation({
    // mutationKey: ["addMessages", chatId],
    mutationFn: async (message: string) => {
      // TODO: add add message mutation
      let id = chatId;
      if (!chatId) {
        if (user_sess.data) {
          id = z.object({ uuid: z.uuidv4() }).parse(
            await ky
              .post("/api/chats/new", {
                body: JSON.stringify({ message: message }),
              })
              .json(),
          ).uuid;

        } else {
          id = crypto.randomUUID();
          await db.chats.add({
            id,
            title: "New Chat",
            lastUpdated: new Date(),
            messages: [],
          });
        }

        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }

      await ky.post(`/api/chats/${id}/new`, { body: JSON.stringify({ message: message }) }).json();
      await queryClient.invalidateQueries({ queryKey: ["messages"] });

      if (!chatId && id) {
        navigate({ to: "/chat/$chatId", params: { chatId: id } });
      }
    },
  });

  function sendQuery() {
    sendMessage.mutate(input);
    setInput("");
  }

  let messages = messagePages.data ? messagePages.data.pages.flatMap((page) => page.messages) : [];
  if (sendMessage.isPending) {
    console.log("pend");
    messages.push({
      id: "pending",
      role: "user",
      senderId: "pending",
      chatId: chatId || "",
      message: sendMessage.variables,
      createdAt: new Date(),
    });
  }

  return (
    <div className={`flex flex-col grow items-center w-full h-screen justify-center p-2`}>
      <motion.div
        animate={{ height: chatId ? "100%" : "auto" }}
        transition={{ duration: 0.2 }}
        className="flex flex-col w-full items-center"
      >
        {messages.map((message) => {
          // im so done with this bro
          return (
            <div
              className={`w-full flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              key={message.id} // as long as message is the smae it doesnt matter
            >
              <div className="p-2 bg-background border rounded-lg mb-1 max-w-1/2">{message.message}</div>
            </div>
          );
        })}
        {sendMessage.isPending ? (
          <div className={`w-full ${chatId ? "flex" : "hidden"} flex-col items-end`} key={sendMessage.variables}>
            <LoaderCircle size={14} className="animate-spin" />
          </div>
        ) : null}
        <div className="mb-auto"></div>
        {messagePages.isPending ? (
          <div className="flex space-x-2 p-10">
            <div className="bg-border rounded-full h-8 w-8 motion-safe:animate-pulse"></div>
          </div>
        ) : null}
        {messagePages.isError ? <div>Failed to load message history</div> : null}
        <h1 className={`font-bold text-2xl md:text-4xl ${chatId ? "opacity-0" : "opacity-100"}`}>CLONE CLONE CLONE</h1>
        <motion.div
          className={`w-full ${chatId ? "" : "md:w-1/2"}`}
          animate={{
            width: chatId ? "100%" : undefined,
          }}
          transition={{ duration: 0.2 }}
        >
          <Textarea
            placeholder={chatId ? loadingFlavorText : blankFlavorText}
            onKeyDown={(evt) => {
              if (evt.code === "Enter" && !evt.shiftKey) {
                evt.preventDefault();
                sendQuery();
              }
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex mt-2">
            <ModelSelector />
            <Button className="ml-auto p-0 cursor-pointer" onClick={sendQuery}>
              <ArrowUpIcon />
            </Button>
          </div>
          {user_sess.data ? null : (
            <div className="text-sm text-center">
              Wanna save your chats???{" "}
              <Link to="/login" className="underline">
                Log in
              </Link>{" "}
              or{" "}
              <Link to="/signup" className="underline">
                Sign up
              </Link>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
