import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronDown, ChevronRight, Copy, RefreshCw } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Message } from "@/lib/db";
import { useTheme } from "@/hooks/use-theme";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import React from "react";
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

function RenderedMsg({ message, last }: { message: Message, last: boolean }) {
  const [showThink, setShowThink] = React.useState(false);
  const or_key = useORKey(state => state.key);
  const model = useModel(state => state.model);

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

  function copyMessage() {
    navigator.clipboard.writeText(message.message);
  }

  const retryMessage = useMutation({
    mutationFn: async () => {
      return await ky.post(`/api/chats/${message.chatId}/retry?msgId=${message.id}`, {
        body: JSON.stringify({ opts: {
          apiKey: or_key,
          model: model.id,
          reasoning_effort: model.thinkingEffort,
          system_prompt: generateSystemPrompt({
            name: nameQ.data,
            selfAttr: selfAttrQ.data,
            traits: traitsQ.data,
          }),
        } }),
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });

  return (
    <div className={`w-full flex ${last ? "min-h-[calc(100vh-20rem)]" : ""} ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
      <div className="group relative max-w-[70%]">
        <div className={`${message.role === "user" ? "border p-2 rounded-lg" : "px-2 py-1"} bg-background mb-1 prose`}>
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

          <MarkdownRenderer>{message.message}</MarkdownRenderer>

          {message.finish_reason && message.finish_reason !== "stop" ? (
            <Alert variant="destructive">
              <AlertTitle>{message.finish_reason}</AlertTitle>
            </Alert>
          ) : null}
        </div>
        <div
          className={`flex items-center opacity-0 transition-opacity absolute ${message.role === "user" ? "right-0" : "left-0"} group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 text-foreground/80`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"ghost"} onClick={() => copyMessage()}>
                <Copy className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Copy message</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"ghost"} onClick={() => retryMessage.mutate()}>
                <RefreshCw className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Regenerate message from this point</p>
            </TooltipContent>
          </Tooltip>
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
