import { AdminChatInfoBar } from "@/components/AdminChatInfoBar";
import { EmptyLoadingScreen } from "@/components/LoadingScreen";
import MessageInput from "@/components/MessageInput";
import MessageRenderer from "@/components/MessageRenderer";
import Onboarding from "@/components/Onboarding";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/Logo";
import { useFiles } from "@/hooks/use-files";
import { useModel } from "@/hooks/use-model";
import { useORKey } from "@/hooks/use-or-key";
import { authClient } from "@/lib/auth-client";
import { generateSystemPrompt } from "@/lib/sys_prompt_gen";
import { __client, queryClient, trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import React, { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatUI,
});

// TODO: when the new chat is created, the input ui loses focus
export function ChatUI() {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const user_sess = authClient.useSession();
  const or_key = useORKey((state) => state.key);

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

  // Check if current user is admin
  const isAdminQuery = useQuery({
    queryKey: ["admin", "checkIsAdmin"],
    queryFn: async () => {
      const result = await authClient.admin.checkIsAdmin();
      return result.data?.isAdmin;
    },
    enabled: !!user_sess.data?.user,
  });

  // Determine if we should show the admin info bar
  const shouldShowAdminInfoBar = useMemo(() => {
    // Only show if we have a chatId, user is logged in, and user is admin
    return !!(chatId && user_sess.data?.user && isAdminQuery.data === true);
  }, [chatId, user_sess.data?.user, isAdminQuery.data]);

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
          api_format: "openai",
          model: model.id,
          baseUrl: "https://openrouter.ai/api/v1",
          system_prompt: generateSystemPrompt({
            name: settingsQuery.data?.name,
            self_attr: settingsQuery.data?.self_attr,
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
      toast.error("Please enter your API Key");
    }
  }

  if (user_sess.isPending) {
    // empty loading page if loading user
    return <EmptyLoadingScreen />;
  }

  if (user_sess.error) {
    return (
      <div className="flex h-screen w-full grow flex-col items-center justify-center p-2">
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
      <div className={`relative flex h-screen w-full grow flex-col items-center justify-center p-2`}>
        {shouldShowAdminInfoBar && <AdminChatInfoBar chatId={chatId ?? ""} />}
        <motion.div
          animate={{ height: chatId ? "100%" : "auto" }}
          transition={{ duration: 0.2 }}
          className={`flex w-full flex-col items-center ${chatId ? "overflow-y-scroll" : "overflow-y-hidden"} px-1`}
          ref={scrollContainerRef}
        >
          <div className="mb-auto w-full">
            <MessageRenderer chatId={chatId} />
          </div>
          <div className={`${chatId ? "opacity-0" : "opacity-100"}`}>
            <Logo className="text-4xl" />
          </div>
          <MessageInput chatId={chatId} sendMessage={sendMessage} isPending={sendMessageMut.isPending} />
        </motion.div>
      </div>
      {location.search.includes("onboarding=true") ? <Onboarding /> : null}
    </>
  );
}
