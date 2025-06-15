import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import ModelSelector from "@/components/ModelSelector";
import MessageRenderer from "@/components/MessageRenderer";
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
import { useORKey } from "@/hooks/use-or-key";
import { useModel } from "@/hooks/use-model";
import { getUserSetting } from "../settings";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatUI,
  // TODO: Add the loader
});

const WSModelStreamResponse = z.object({
  finish_reason: z.nullable(z.string()),
  reasoning: z.string(),
  content: z.string(),
  refusal: z.string(),
  tool_calls: z.nullable(z.any()),
});
type WSModelStreamResponse = z.infer<typeof WSModelStreamResponse>;

// TODO: when the new chat is created, the input ui loses focus
// pure scuff
export function ChatUI() {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
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
  const or_key = useORKey((state) => state.key);

  const { chatId } = useParams({
    from: "/chat/$chatId",
    shouldThrow: false,
  }) ?? { chatId: undefined };

  const [activeMessage, setActiveMessage] = React.useState<WSModelStreamResponse[]>([]);
  const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null);
  const model = useModel((state) => state.model);
  const [input, setInput] = React.useState("");

  const nameQ = useQuery({
    queryKey: ["name", user_sess?.data?.user?.id],
    queryFn: () => getUserSetting("name", user_sess?.data?.user?.id),
    enabled: !user_sess.isPending && !user_sess.error,
  });
  const selfAttrQ = useQuery({
    queryKey: ["self-attr", user_sess?.data?.user?.id],
    queryFn: () => getUserSetting("self-attr", user_sess?.data?.user?.id),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const traitsQ = useQuery({
    queryKey: ["traits", user_sess?.data?.user?.id],
    queryFn: () => getUserSetting("traits", user_sess?.data?.user?.id),
    enabled: !user_sess.isPending && !user_sess.error,
  });

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
        } else if (!user_sess.error && !user_sess.isPending) {
          let chat = await db.chats.get(chatId);
          if (!chat) {
            toast.error("Chat not found");
            navigate({ to: "/chat" });
          }
          return { messages: z.array(Message).parse(chat), cursor: cursor };
        } else {
          throw new Error("User Session is erroring");
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
                body: JSON.stringify({
                  message: message,
                  opts: {
                    apiKey: or_key,
                    model: "openai/gpt-4.1-mini",
                  },
                }),
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

      z.object({ msgId: z.string() }).parse(
        await ky
          .post(`/api/chats/${id}/new`, {
            body: JSON.stringify({
              message: message,
              opts: {
                apiKey: or_key,
                model: model.id, // nvm we need zustand LOL
                system_prompt: `${nameQ.data ? `The person wishes to be called ${nameQ.data}\n` : ""}${selfAttrQ.data ? `The person has also informed the assistant that they are ${selfAttrQ.data}.\n` : ""}${traitsQ.data ? `The person perfers the assistant to act in this way: ${traitsQ.data}` : ""}`,
              },
            }),
          })
          .json(),
      ).msgId;

      await queryClient.invalidateQueries({ queryKey: ["messages"] });

      if (!chatId && id) {
        navigate({ to: "/chat/$chatId", params: { chatId: id } });
      }
    },
  });

  let messagesForRenderer: Message[] = [];

  // Process historical messages
  if (messagePages.data) {
    const historicalMessages = messagePages.data.pages.flatMap((page) => page.messages);
    messagesForRenderer = historicalMessages.map(msg => {
      if (msg.senderId === "assistant_tool_response") {
        return { ...msg, message: "Web search results processed." };
      }
      return msg;
    });
  }

  if (sendMessage.isPending) {
    messagesForRenderer.push({
      id: "pending",
      role: "user",
      senderId: user_sess?.data?.user?.id || "pending_user",
      chatId: chatId || "",
      message: sendMessage.variables,
      reasoning: null,
      finish_reason: null,
      createdAt: new Date(),
    });
  }

  if (activeMessageId) {
    const currentAccumulatedContent = activeMessage.reduce((prev, cur) => prev + cur.content, "");
    const isToolResponseStream = activeMessage.length > 0 && activeMessage.some(chunk => chunk.finish_reason === "tool_response");
    const isCallingToolStream = !isToolResponseStream && currentAccumulatedContent.includes("<WEB_SEARCH_TOOL>") && currentAccumulatedContent.includes("</WEB_SEARCH_TOOL>");

    let displayMessage = currentAccumulatedContent;

    if (isToolResponseStream) {
      displayMessage = `${model.id} is searching the web...`;
    } else if (isCallingToolStream) {
      displayMessage = "Calling web search...";
    }

    messagesForRenderer.push({
      id: "assistant_pending",
      role: "assistant",
      senderId: "assistant_pending", 
      chatId: chatId || "",
      message: displayMessage,
      reasoning: activeMessage.reduce((prev, cur) => prev + cur.reasoning, ""),
      finish_reason: activeMessage.reduce((prev: string | null, cur) => cur.finish_reason || prev, null),
      createdAt: new Date(),
    });
  }

  React.useEffect(() => {
    // auto scroll to the bottom when a new message is added
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [activeMessage, messagePages.data])

  // ~~websocketless~~ websocketed :( event notifier
  React.useEffect(() => {
    let ws: WebSocket | null = null;
    if (chatId) {
      ws = new WebSocket(`ws://${window.location.host}/api/chats/${chatId}/ws`);

      ws.onmessage = (event) => {
        try {
          const payload = z
            .object({
              jsonrpc: z.literal("2.0"),
              method: z.string(),
              params: z.any(),
              id: z.optional(z.union([z.number(), z.string()])),
            })
            .parse(JSON.parse(event.data));

          switch (payload.method) {
            case "invalidate":
              queryClient.invalidateQueries({ queryKey: [z.string().parse(payload.params)] });
              break;
            case "activeMessage":
              if (payload.params) {
                setActiveMessageId(payload.params);
                ws!.send(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    method: "subscribe",
                    params: payload.params,
                    id: payload.params,
                  }),
                );
              } else {
                setActiveMessageId(null);
                setActiveMessage([]);
              }
              break;
            case "chunk":
              const data = WSModelStreamResponse.safeParse(payload.params);
              if (data.success) {
                setActiveMessage((prev) => [...prev, data.data]);
              } else {
                console.error(data.error);
              }
              break;
            default:
              console.log(`Received event: ${payload.method} with data: ${payload.params}`);
          }
        } catch (err) {
          console.error("Failed parsing message:", event.data);
        }
      };
    }

    return () => {
      if (ws) {
        ws.onmessage = null;
        ws.close();
      }
    };
  }, [chatId]);

  function sendQuery() {
    if (model.id) {
      sendMessage.mutate(input);
      setInput("");
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    } else {
      toast.error("Please select a model");
    }
  }

  let messages = messagePages.data ? messagePages.data.pages.flatMap((page) => page.messages) : [];
  if (sendMessage.isPending) {
    messages.push({
      id: "pending",
      role: "user",
      senderId: "pending",
      chatId: chatId || "",
      message: sendMessage.variables,
      reasoning: null,
      finish_reason: null,
      createdAt: new Date(),
    });
  }

  if (activeMessageId) {
    messages.push({
      id: "assistant_pending",
      role: "assistant",
      senderId: "assistant_pending",
      chatId: chatId || "",
      message: activeMessage.reduce((prev, cur) => prev + cur.content, ""),
      reasoning: activeMessage.reduce((prev, cur) => prev + cur.reasoning, ""),
      finish_reason: activeMessage.reduce((prev: string | null, cur) => (prev ? prev : cur.finish_reason), null),
      createdAt: new Date(),
    });
  }

  return (
    <div className={`flex flex-col grow items-center w-full h-screen justify-center p-2 relative`}>
      {/* {!chatId && (
        <Link to="/settings" className="fixed top-2 right-2 z-10">
          <SettingsIcon size={14} />
        </Link>
      )} */}

      <motion.div
        ref={scrollContainerRef}
        animate={{ height: chatId ? "100%" : "auto" }}
        transition={{ duration: 0.2 }}
        className="flex flex-col w-full items-center overflow-y-auto"
      >
        <MessageRenderer messages={messagesForRenderer} />
        {sendMessage.isPending || activeMessageId ? (
          <div
            className={`w-full ${chatId ? "flex" : "hidden"} flex-col ${sendMessage.isPending ? "items-end" : "items-start"}`}
            key={sendMessage.variables}
          >
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
          className={`w-full ${chatId ? "" : "md:w-1/2"} sticky bottom-0 bg-background`}
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

            <Button
              className="ml-auto p-0 cursor-pointer"
              onClick={sendQuery}
              disabled={!!activeMessageId || !nameQ.isSuccess || !selfAttrQ.isSuccess || !traitsQ.isSuccess}
            >
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
