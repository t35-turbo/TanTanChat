import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import MessageRenderer from "@/components/MessageRenderer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import React from "react";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { __client, queryClient, trpc } from "@/lib/trpc";
import { z } from "zod/v4-mini";
import ky from "ky";

import { toast } from "sonner";
import { useORKey } from "@/hooks/use-or-key";
import { useModel } from "@/hooks/use-model";
import { generateSystemPrompt } from "@/lib/sys_prompt_gen";
import { useTools } from "@/hooks/use-tools";
import { useFiles } from "@/hooks/use-files";
import { toastEnterAPIKey } from "@/lib/utils";
import Onboarding from "@/components/Onboarding";
import { EmptyLoadingScreen } from "@/components/LoadingScreen";
import MessageInput from "@/components/MessageInput";
import { ChunkData, useActiveId, useActiveMessage } from "@/components/WSManager";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatUI,
});

// TODO: when the new chat is created, the input ui loses focus
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

  const model = useModel((state) => state.model);

  const files = useFiles((state) => state.files);
  const clearFiles = useFiles((state) => state.clearFiles);

  const settingsQuery = useQuery({
    ...trpc.settings.get.queryOptions(),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const sendMessageMut = useMutation({
    mutationKey: ["sendMessage", chatId],
    mutationFn: async (message: string) => {
      if (or_key === null) {
        // TODO: real error handling
        return;
      }

      let newChatId = chatId;
      if (!newChatId) {
        newChatId = await __client.chats.newThread.mutate({
          message,
          opts: { apiKey: or_key ?? "", model: "openai/gpt-4.1-mini" },
        });

        queryClient.invalidateQueries({ queryKey: trpc.chats.listThreads.queryKey() });
      }

      await __client.chats.newMessage.mutate({
        chatId: newChatId,
        message,
        opts: {
          apiKey: or_key,
          model: model.id,
          system_prompt: generateSystemPrompt({
            name: settingsQuery.data?.name,
            selfAttr: settingsQuery.data?.selfAttr,
            traits: settingsQuery.data?.traits,
          }),
          tools: null,
        },
        files: files.map((file) => file.id),
      });

      clearFiles(); // remove files from input

      await queryClient.invalidateQueries({ queryKey: trpc.chats.threadHistory.queryKey({ chatId: newChatId }) });

      if (!chatId && newChatId) {
        // go to the new chatid thread if it's the first message in a chat
        navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      }
    },
  });

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
      toastEnterAPIKey();
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
            <MessageRenderer chatId={chatId} />
          </div>
          <h1 className={`font-bold text-2xl md:text-4xl ${chatId ? "opacity-0" : "opacity-100"}`}>7o</h1>
          <MessageInput chatId={chatId} sendMessage={sendMessage} isPending={sendMessageMut.isPending} />
        </motion.div>
      </div>
      {location.search.includes("onboarding=true") ? <Onboarding /> : null}
    </>
  );
}
