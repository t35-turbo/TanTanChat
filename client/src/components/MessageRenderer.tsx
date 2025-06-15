import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronsUpDown } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Message } from "@/lib/db";
import { useTheme } from "@/hooks/use-theme";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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
  return (
    <div className={`w-full flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
      <div className="p-2 bg-background border rounded-lg mb-1 max-w-[65%] prose">
        {message.reasoning ? (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1">
              Show Thinking <ChevronsUpDown size={14} />
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
