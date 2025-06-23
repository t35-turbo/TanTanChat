import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import ModelSelector from "@/components/ModelSelector";
import MessageRenderer from "@/components/MessageRenderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, LoaderCircle, SquareIcon } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
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
import FileDisplay from "@/components/FileDisplay";
import { useFiles } from "@/hooks/use-files";
import Onboarding from "@/components/Onboarding";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatUI,
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
    const options = [
      "Our Bioneural Networks are busy at work",
      "nice prompt bro",
      "Remember to say thank you!",
      "If you say please i'll be more helpful",
    ];
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
  const files = useFiles((state) => state.files);
  const clearFiles = useFiles((state) => state.clearFiles);

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

  React.useEffect(() => {
    if (!user_sess.isPending && !user_sess.data && !user_sess.error) {
      navigate({ to: "/login" });
    }
  }, [user_sess]);

  // HACK: do we really need inf. query? it has been disabled for now
  const messagePages = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam: cursor }) => {
      if (user_sess.data) {
        if (chatId) {
          // TODO: get messages
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
          return z.object({ messages: z.array(Message) }).parse(messages);
        } else {
          return { messages: [], cursor: 0 };
        }
      } else {
        throw new Error("User Session is erroring");
      }
    },
    initialPageParam: 0,
    getNextPageParam: () => 0,
    enabled: !user_sess.isPending,
  });

  React.useEffect(() => {
    if (messagePages.data && !messagePages.isPending && scrollContainerRef.current) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [messagePages.data, messagePages.isPending]);

  const sendMessageMut = useMutation({
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
              files: files.map((file) => file.id),
            }),
          })
          .json(),
      ).msgId;

      clearFiles(); // remove files from input

      await queryClient.invalidateQueries({ queryKey: ["messages"] });

      if (!chatId && newChatId) {
        // go to the new chatid thread if it's the first message in a chat
        navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      }
    },
  });

  // ~~websocketless~~ websocketed :( event notifier
  React.useEffect(() => {
    let ws: WebSocket | null = null;
    if (chatId) {
      const isDev = import.meta.env.MODE === "development";
      const protocol = isDev || window.location.protocol === "http:" ? "ws" : "wss";
      ws = new WebSocket(`${protocol}://${window.location.host}/api/chats/${chatId}/ws`);

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

  function sendMessage() {
    if (or_key) {
      if (model.id) {
        sendMessageMut.mutate(input);
        setInput("");
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      } else {
        toast.error("Please select a model");
      }
    } else {
      toast.error("Please set your OpenRouter key in settings.");
    }
  }

  let messages = messagePages.data ? messagePages.data.pages.flatMap((page) => page.messages) : [];
  if (sendMessageMut.isPending) {
    messages.push({
      id: "pending",
      role: "user",
      senderId: "pending",
      chatId: chatId || "",
      message: sendMessageMut.variables,
      reasoning: null,
      files: null,
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
      files: null,
      createdAt: new Date(),
    });
  }

  if (user_sess.isPending) {
    // empty loading page if loading user
    return <EmptyLoadingScreen />;
  }

  if (user_sess.error) {
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
    <>
      <div className={`flex flex-col grow items-center w-full h-screen justify-center p-2 relative`}>
        <motion.div
          ref={scrollContainerRef}
          animate={{ height: chatId ? "100%" : "auto" }}
          transition={{ duration: 0.2 }}
          className="flex flex-col w-full items-center overflow-y-scroll"
        >
          <div className="mb-auto w-full">
            <MessageRenderer messages={messages} />
          </div>
          {messagePages.isPending ? (
            <div className="flex space-x-2 p-10">
              <div className="bg-border rounded-full h-8 w-8 motion-safe:animate-pulse"></div>
            </div>
          ) : null}
          {messagePages.isError ? <div>Failed to load message history</div> : null}
          <h1 className={`font-bold text-2xl md:text-4xl ${chatId ? "opacity-0" : "opacity-100"}`}>7o</h1>
          <motion.div
            className={`w-full ${chatId ? "" : "md:w-1/2"} sticky bottom-0 bg-background`}
            animate={{
              width: chatId ? "100%" : undefined,
            }}
            transition={{ duration: 0.2 }}
          >
            {sendMessageMut.isPending || activeMessageId ? (
              <div
                className={`w-full ${chatId ? "flex" : "hidden"} justify-end p-2 ${sendMessageMut.isPending ? "items-end" : "items-start"}`}
                key={sendMessageMut.variables}
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
                  sendMessage();
                }
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <div className="flex mt-2 gap-1">
              <ModelSelector />

              <Button
                className="ml-auto p-0 cursor-pointer"
                onClick={sendMessage}
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
        </motion.div>
      </div>
      {location.search.includes("onboarding=true") ? <Onboarding /> : null}
    </>
  );
}

function EmptyLoadingScreen() {
  return (
    <div className="flex flex-col grow items-center w-full h-screen justify-center p-2">
      <div className="bg-border rounded-full size-10 motion-safe:animate-pulse"></div>
    </div>
  );
}
