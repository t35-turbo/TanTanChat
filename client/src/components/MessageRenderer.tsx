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

interface MessageRendererProps {
  messages: Message[];
}

export function MessageRenderer({ messages }: MessageRendererProps) {
  return (
    <>
      {messages.map((message) => (
        <RenderedMsg message={message} key={message.id} />
      ))}
    </>
  );
}

function RenderedMsg({ message }: { message: Message }) {
  const [showThink, setShowThink] = React.useState(false);

  function copyMessage() {
    navigator.clipboard.writeText(message.message);
  }

  function retryMessage() {}

  return (
    <div className={`w-full flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`} key={message.id}>
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
          className={`flex items-center opacity-0 transition-opacity absolute z-10 ${message.role === "user" ? "right-0" : "left-0"} group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 text-foreground/80`}
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
              <Button variant={"ghost"} onClick={() => retryMessage()}>
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
