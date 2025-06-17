import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import ModelSelector from "@/components/ModelSelector";
import MessageRenderer from "@/components/MessageRenderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, LoaderCircle, SquareIcon } from "lucide-react";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/routes/__root";
import { z } from "zod/v4-mini";
import ky, { HTTPError } from "ky";
import { Message } from "@/lib/db";
import { toast } from "sonner";
import { useORKey } from "@/hooks/use-or-key";
import { useModel } from "@/hooks/use-model";
import { getUserSetting } from "../settings";
import { generateSystemPrompt } from "@/lib/sys_prompt_gen";
import { useTools } from "@/hooks/use-tools";

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
    const options = ["Our Bioneural Networks are busy at work", "nice prompt bro", "Remember to say thank you!"];
    return options[Math.floor(Math.random() * options.length)];
  }, []);

  const navigate = useNavigate();
  const user_sess = authClient.useSession();
  const or_key = useORKey((state) => state.key);
  const web_search = useTools((state) => state.web_search);

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

  useEffect(() => {
    (async () => {
      const { data, error } = await authClient.getSession();

      if (!data && !error) {
        navigate({ to: "/login" });
      }
    })();
  }, []);

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
      let newChatId = chatId;
      if (!newChatId) {
        newChatId = z.object({ uuid: z.uuidv4() }).parse(
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

        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }

      z.object({ msgId: z.string() }).parse(
        await ky
          .post(`/api/chats/${newChatId}/new`, {
            body: JSON.stringify({
              message: message,
              opts: {
                apiKey: or_key,
                model: model.id, // nvm we need zustand LOL
                system_prompt: generateSystemPrompt({
                  name: nameQ.data,
                  selfAttr: selfAttrQ.data,
                  traits: traitsQ.data,
                }),
                tools: {
                  web_search,
                },
              },
            }),
          })
          .json(),
      ).msgId;

      await queryClient.invalidateQueries({ queryKey: ["messages"] });

      if (!chatId && newChatId) {
        navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      }
    },
  });

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

  if (user_sess.isPending) {
    return (
      <div className="flex flex-col grow items-center w-full h-screen justify-center p-2">
        <div className="bg-border rounded-full size-10 motion-safe:animate-pulse"></div>
      </div>
    );
  }

  if (user_sess.error) {
    console.log(user_sess.error);
    return (
      <div className="flex flex-col grow items-center w-full h-screen justify-center p-2">
        <div>
          Error Loading User Sessions{" "}
          <Button onClick={() => window.location.reload()} variant={"link"}>
            Reload?
          </Button>
        </div>
        <div>{user_sess.error.message || user_sess.error.statusText}</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col grow items-center w-full h-screen justify-center p-2 relative`}>
      <motion.div
        ref={scrollContainerRef}
        animate={{ height: chatId ? "100%" : "auto" }}
        transition={{ duration: 0.2 }}
        className="flex flex-col w-full items-center overflow-y-auto"
      >
        <MessageRenderer messages={messages} />
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
          {sendMessage.isPending || activeMessageId ? (
            <div
              className={`w-full ${chatId ? "flex" : "hidden"} justify-end p-2 ${sendMessage.isPending ? "items-end" : "items-start"}`}
              key={sendMessage.variables}
            >
              <LoaderCircle className="animate-spin size-4" />
            </div>
          ) : null}
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
          <div className="flex mt-2 gap-2">
            <ModelSelector />

            <Button
              className="ml-auto p-0 cursor-pointer"
              onClick={sendQuery}
              disabled={!!activeMessageId && input.trim() === ""}
            >
              {!activeMessageId ? <ArrowUpIcon /> : <SquareIcon className="fill-background" />}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
