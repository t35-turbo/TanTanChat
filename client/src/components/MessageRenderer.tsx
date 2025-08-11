import { Alert, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useModel } from "@/hooks/use-model";
import { useORKey } from "@/hooks/use-or-key";
import { useTheme } from "@/hooks/use-theme";
import { authClient } from "@/lib/auth-client";
import { generateSystemPrompt } from "@/lib/sys_prompt_gen";
import { __client, type Message, queryClient, type RouterOutput, trpc } from "@/lib/trpc";
import { useMutation, useMutationState, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronRight, Copy, Paperclip, RefreshCw, SquarePen, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { z } from "zod/v4-mini";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useActiveId, useActiveMessage } from "./WSManager";

interface MessageRendererProps {
  chatId?: string;
}

export function MessageRenderer({ chatId }: MessageRendererProps) {
  const { chunks: activeMessage, setChunks: setActiveMessage } = useActiveMessage();
  const activeId = useActiveId();
  const navigate = useNavigate();

  // Use useMutationState to access the sendMessage mutation state
  const sendMessageVariables = useMutationState<string | null>({
    filters: { mutationKey: ["sendMessage", chatId], status: "pending" },
    select: (mutation) => z.string().parse(mutation.state.variables ?? ""),
  })[0];

  const messagePages = useQuery({
    ...trpc.chats.threadHistory.queryOptions({ chatId: chatId ?? "" }),
    enabled: !!chatId,
    queryFn: async () => {
      let data: RouterOutput["chats"]["threadHistory"];
      try {
        data = await __client.chats.threadHistory.query({ chatId: chatId ?? "" });
      } catch (err) {
        console.log(err);
        toast.error("Chat not found");
        navigate({ to: "/chat" });
        throw err;
      }

      if (!activeId && activeMessage.length > 0 && setActiveMessage) {
        setActiveMessage([]);
      }

      return data;
    },
  });

  const messages = [...(messagePages.data ?? [])];

  if (sendMessageVariables) {
    messages.push({
      id: "pending",
      role: "user",
      senderId: "pending",
      chatId: chatId || "",
      message: sendMessageVariables,
      reasoning: null,
      files: null,
      finish_reason: null,
      createdAt: new Date(),
    });
  }

  if (activeMessage.length > 0) {
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

  if (messagePages.isPending && chatId) {
    return (
      <div className="flex space-x-2 p-10">
        <div className="bg-border h-8 w-8 rounded-full motion-safe:animate-pulse"></div>
      </div>
    );
  }

  if (messagePages.isError) {
    return <div>Failed to load message history</div>;
  }

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

  const settingsQuery = useQuery({
    ...trpc.settings.get.queryOptions(),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const files = useQuery({
    queryKey: ["files", message.files],
    queryFn: async () => {
      if (message.files) {
        return await Promise.all(message.files.map((file) => __client.files.getMetadata.query({ id: file })));
      } else {
        return [];
      }
    },
  });

  const retryMessage = useMutation(
    trpc.chats.retryMessage.mutationOptions({
      onSettled: () => {
        setEditMessage("");
        setEditingMessage(false);
        if (message.chatId) {
          return queryClient.invalidateQueries({
            queryKey: trpc.chats.threadHistory.queryKey({ chatId: message.chatId }),
          });
        }
      },
    }),
  );

  const deleteFile = useMutation(
    trpc.chats.removeFile.mutationOptions({
      onSettled: () => {
        if (message.chatId) {
          return queryClient.invalidateQueries({
            queryKey: trpc.chats.threadHistory.queryKey({ chatId: message.chatId }),
          });
        }
      },
    }),
  );

  function textareaShortcutHandler(evt: React.KeyboardEvent<HTMLTextAreaElement>) {
    switch (evt.code) {
      case "Escape":
        setEditingMessage(false);
        setEditMessage("");
        evt.preventDefault();
        break;
      case "Enter":
        if (
          !evt.shiftKey &&
          !evt.metaKey &&
          !evt.ctrlKey &&
          !evt.altKey &&
          !("ontouchstart" in window || navigator.maxTouchPoints > 0)
        ) {
          retryMessage.mutate({
            // HACK: this is just atrocious. i mean like why is this even a thing, trpc should get some better side effect or mixin
            chatId: message.chatId,
            msgId: message.id,
            message: editMessage,
            opts: {
              apiKey: or_key ?? "",
              model: model.id,
              baseUrl: "https://openrouter.ai/api/v1",
              api_format: "openai",
              reasoning_effort: model.thinkingEffort,
              system_prompt: generateSystemPrompt({
                name: settingsQuery.data?.name ?? "",
                self_attr: settingsQuery.data?.self_attr ?? "",
                traits: settingsQuery.data?.traits ?? "",
              }),
            },
          });
          evt.preventDefault();
        }
    }
  }

  return (
    <div
      className={`flex w-full flex-col gap-1 ${last ? "min-h-[calc(100vh-20rem)]" : ""} ${message.role === "user" ? "items-end" : "items-start"}`}
      key={message.id}
    >
      {files.data && files.data.length > 0
        ? files.data.map((file) => (
            <div
              key={file.fileId}
              className="group relative flex cursor-default items-center rounded-lg border p-1 text-sm italic"
            >
              <Paperclip className="size-3" />
              {file.fileName}
              <button
                className="text-destructive-foreground hover:bg-destructive/80 absolute -bottom-1 -left-1 hidden rounded-full p-0.5 group-hover:block"
                onClick={() => deleteFile.mutate({ chatId: message.chatId, msgId: message.id, fileId: file.fileId })}
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
            className={`${message.role === "user" ? "ml-auto rounded-lg border p-2" : "px-2 py-1"} bg-background prose mb-1`}
          >
            {message.reasoning ? (
              <Collapsible>
                <CollapsibleTrigger
                  className="text-foreground/50 hover:text-foreground flex items-center gap-1 transition-all"
                  onClick={() => setShowThink(!showThink)}
                >
                  {showThink ? <ChevronDown /> : <ChevronRight />} {showThink ? "Hide Thinking" : "Show Thinking"}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <MarkdownRenderer>{message.reasoning ?? ""}</MarkdownRenderer>
                </CollapsibleContent>
              </Collapsible>
            ) : null}

            <MarkdownRenderer>{retryMessage.variables?.message ?? message.message}</MarkdownRenderer>

            {message.finish_reason && message.finish_reason !== "stop" ? (
              <Alert variant="destructive">
                <AlertTitle>{message.finish_reason}</AlertTitle>
              </Alert>
            ) : null}
          </div>
        )}
        <div
          className={`absolute flex items-center opacity-0 transition-opacity ${message.role === "user" ? "right-0" : "left-0"} text-foreground/80 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100`}
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
                  <Button
                    variant={"ghost"}
                    onClick={() =>
                      retryMessage.mutate({
                        chatId: message.chatId,
                        msgId: message.id,
                        message: editMessage,
                        opts: {
                          apiKey: or_key ?? "",
                          model: model.id,
                          baseUrl: "https://openrouter.ai/api/v1",
                          api_format: "openai",
                          reasoning_effort: model.thinkingEffort,
                          system_prompt: generateSystemPrompt({
                            name: settingsQuery.data?.name ?? "",
                            self_attr: settingsQuery.data?.self_attr ?? "",
                            traits: settingsQuery.data?.traits ?? "",
                          }),
                        },
                      })
                    }
                  >
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
                  <Button
                    variant={"ghost"}
                    onClick={() =>
                      retryMessage.mutate({
                        chatId: message.chatId,
                        msgId: message.id,
                        opts: {
                          apiKey: or_key ?? "",
                          api_format: "openai",
                          model: model.id,
                          baseUrl: "https://openrouter.ai/api/v1",
                          reasoning_effort: model.thinkingEffort,
                          system_prompt: generateSystemPrompt({
                            name: settingsQuery.data?.name ?? "",
                            self_attr: settingsQuery.data?.self_attr ?? "",
                            traits: settingsQuery.data?.traits ?? "",
                          }),
                        },
                      })
                    }
                  >
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

  const [rehypePlugins, setRehypePlugins] = useState<any[]>([]);
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([]);
  // Dynamically load KaTeX CSS only when this component is mounted
  useEffect(() => {
    (async () => {
      import("katex/dist/katex.min.css");
      const rehypePlugins = [(await import("rehype-katex")).default];
      const remarkPlugins = [(await import("remark-math")).default];
      setRehypePlugins(rehypePlugins);
      setRemarkPlugins(remarkPlugins);
    })();
  }, []);

  const preprocessMathBlocks = React.useCallback((text: string): string => {
    // Convert display math wrapped in \[ ... \] to $$ blocks so that remark-math can parse them
    // Supports multiline content inside the delimiters.
    return text.replace(/\\\[((?:.|\n)+?)\\\]/g, (_, content: string) => `\n$$\n${content}\n$$`);
  }, []);

  const processedChildren = React.useMemo(() => {
    return typeof children === "string" ? preprocessMathBlocks(children) : (children ?? "");
  }, [children, preprocessMathBlocks]);

  return (
    <ReactMarkdown
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "");
          return match ? (
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
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
    >
      {processedChildren}
    </ReactMarkdown>
  );
}

export default MessageRenderer;
