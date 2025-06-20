import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, ChevronDown, ChevronRight, Copy, Paperclip, RefreshCw, SquarePen, Trash2, X } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Message } from "@/lib/db";
import { useTheme } from "@/hooks/use-theme";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/routes/__root";
import ky from "ky";
import { useORKey } from "@/hooks/use-or-key";
import { useModel } from "@/hooks/use-model";
import { generateSystemPrompt } from "@/lib/sys_prompt_gen";
import { authClient } from "@/lib/auth-client";
import { getUserSetting } from "@/routes/settings";
import { Textarea } from "./ui/textarea";
import { z } from "zod/v4-mini";

interface MessageRendererProps {
  messages: Message[];
}

export function MessageRenderer({ messages }: MessageRendererProps) {
  return (
    <>
      {messages.map((message, idex) => (
        <RenderedMsg message={message} key={message.id} last={idex === messages.length - 1} />
      ))}
    </>
  );
}

function RenderedMsg({ message, last }: { message: Message; last: boolean }) {
  const [showThink, setShowThink] = React.useState(false);
  const or_key = useORKey((state) => state.key);
  const model = useModel((state) => state.model);
  const [editMessage, setEditMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState(false);

  const user_sess = authClient.useSession();

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

  const files = useQuery({
    queryKey: ["files", message.files],
    queryFn: async () => {
      if (message.files) {
        return z
          .array(z.object({ fileId: z.string(), fileName: z.string() }))
          .parse(await Promise.all(message.files.map((file) => ky.get(`/api/files/${file}/metadata`).json())));
      } else {
        return [];
      }
    },
  });

  const retryMessage = useMutation({
    mutationFn: async (newMessage?: string) => {
      return await ky.post(`/api/chats/${message.chatId}/retry?msgId=${message.id}`, {
        body: JSON.stringify({
          message: newMessage,
          opts: {
            apiKey: or_key,
            model: model.id,
            reasoning_effort: model.thinkingEffort,
            system_prompt: generateSystemPrompt({
              name: nameQ.data,
              selfAttr: selfAttrQ.data,
              traits: traitsQ.data,
            }),
          },
        }),
      });
    },
    onSettled: () => {
      setEditMessage("");
      setEditingMessage(false);
      return queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      return await ky.delete(`/api/chats/${message.chatId}/file?msgId=${message.id}&fileId=${fileId}`);
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });

  function textareaShortcutHandler(evt: React.KeyboardEvent<HTMLTextAreaElement>) {
    switch (evt.code) {
      case "Escape":
        setEditingMessage(false);
        setEditMessage("");
        evt.preventDefault();
        break;
      case "Enter":
        if (!evt.shiftKey && !evt.metaKey && !evt.ctrlKey && !evt.altKey) {
          retryMessage.mutate(editMessage);
          evt.preventDefault();
        }
    }
  }

  return (
    <div
      className={`w-full flex flex-col gap-1 ${last ? "min-h-[calc(100vh-20rem)]" : ""} ${message.role === "user" ? "items-end" : "items-start"}`}
      key={message.id}
    >
      {files.data && files.data.length > 0
        ? files.data.map((file) => (
            <div key={file.fileId} className="text-sm border rounded-lg italic p-1 flex items-center group cursor-default relative">
              <Paperclip className="size-3" />
              {file.fileName}
              <button
                className="absolute -bottom-1 -left-1 hidden group-hover:block text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/80"
                onClick={() => deleteFile.mutate(file.fileId)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))
        : null}
      <div className={`group relative max-w-[70%] ${editingMessage ? "w-full" : ""}`}>
        {editingMessage ? (
          <div className="flex flex-col gap-3">
            <div className="w-full overflow-y-scroll">
              <Textarea
                value={editMessage}
                className=""
                onChange={(evt) => setEditMessage(evt.target.value)}
                onKeyDown={textareaShortcutHandler}
              />
            </div>
          </div>
        ) : (
          <div
            className={`${message.role === "user" ? "border p-2 rounded-lg ml-auto" : "px-2 py-1"} bg-background mb-1 prose`}
          >
            {message.reasoning ? (
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center gap-1 transition-all text-foreground/50 hover:text-foreground"
                  onClick={() => setShowThink(!showThink)}
                >
                  {showThink ? <ChevronDown /> : <ChevronRight />} {showThink ? "Hide Thinking" : "Show Thinking"}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <MarkdownRenderer>{message.reasoning ?? ""}</MarkdownRenderer>
                </CollapsibleContent>
              </Collapsible>
            ) : null}

            <MarkdownRenderer>{retryMessage.variables ?? message.message}</MarkdownRenderer>

            {message.finish_reason && message.finish_reason !== "stop" ? (
              <Alert variant="destructive">
                <AlertTitle>{message.finish_reason}</AlertTitle>
              </Alert>
            ) : null}
          </div>
        )}
        <div
          className={`flex items-center opacity-0 transition-opacity absolute ${message.role === "user" ? "right-0" : "left-0"} group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 text-foreground/80`}
        >
          {editingMessage ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"ghost"}
                    onClick={() => {
                      setEditingMessage(false);
                      setEditMessage("");
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Cancel</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={"ghost"} onClick={() => retryMessage.mutate(editMessage)}>
                    <Check className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={"ghost"} onClick={() => navigator.clipboard.writeText(message.message)}>
                    <Copy className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Copy message</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={"ghost"} onClick={() => retryMessage.mutate(undefined)}>
                    <RefreshCw className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Regenerate message from this point</p>
                </TooltipContent>
              </Tooltip>
              {message.role === "user" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"ghost"}
                      onClick={() => {
                        setEditingMessage(true);
                        setEditMessage(message.message);
                      }}
                    >
                      <SquarePen className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Edit Message</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownRenderer({ children }: { children: string | null | undefined }) {
  const base = useTheme((state) => state.base);
  return (
    <ReactMarkdown
      components={{
        code(props) {
          const { children, className, node, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
            <>
              <SyntaxHighlighter
                PreTag="div"
                children={String(children).replace(/\n$/, "")}
                language={match[1]}
                style={{
                  ...(base === "white" || base === "latte" ? oneLight : oneDark),
                  'pre[class*="language-"]': {
                    background: "transparent",
                  },
                  'code[class*="language-"]': {
                    background: "transparent",
                  },
                }}
              />
            </>
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
    >
      {children}
    </ReactMarkdown>
  );
}

export default MessageRenderer;
