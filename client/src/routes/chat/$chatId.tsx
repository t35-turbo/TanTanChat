import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import ModelSelector from "@/components/ModelSelector";
import MessageRenderer from "@/components/MessageRenderer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import React from "react";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/routes/__root";
import { z } from "zod/v4-mini";
import ky from "ky";

import { toast } from "sonner";
import { useORKey } from "@/hooks/use-or-key";
import { useModel } from "@/hooks/use-model";
import { getUserSetting } from "../settings";
import { generateSystemPrompt } from "@/lib/sys_prompt_gen";
import { useTools } from "@/hooks/use-tools";
import { useFiles } from "@/hooks/use-files";
import Onboarding from "@/components/Onboarding";
import { EmptyLoadingScreen } from "@/components/LoadingScreen";
import MessageInput from "@/components/MessageInput";

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

  const sendMessageMut = useMutation({
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

  function sendMessage(message: string) {
    if (or_key) {
      if (model.id) {
        sendMessageMut.mutate(message);
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
          animate={{ height: chatId ? "100%" : "auto" }}
          transition={{ duration: 0.2 }}
          className="flex flex-col w-full items-center overflow-y-scroll"
          ref={scrollContainerRef}
        >
          <div className="mb-auto w-full">
            <MessageRenderer
              chatId={chatId}
              activeMessage={activeMessage}
              activeMessageId={activeMessageId}
              sendMessageIsPending={sendMessageMut.isPending}
              sendMessageVariables={sendMessageMut.variables}
            />
          </div>
          <h1 className={`font-bold text-2xl md:text-4xl ${chatId ? "opacity-0" : "opacity-100"}`}>7o</h1>
          <MessageInput
            chatId={chatId}
            sendMessage={sendMessage}
            isPending={sendMessageMut.isPending}
            activeMessageId={activeMessageId}
            pendingVariables={sendMessageMut.variables}
          />
        </motion.div>
      </div>
      {location.search.includes("onboarding=true") ? <Onboarding /> : null}
    </>
  );
}


