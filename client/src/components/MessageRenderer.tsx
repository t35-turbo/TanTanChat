import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ChevronsUpDown, Search, TestTube } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Message } from "@/lib/db";
import { useTheme } from "@/hooks/use-theme";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ToolCallRenderer } from "./ToolCallRenderer";

interface MessageRendererProps {
  messages: Message[];
}

export function MessageRenderer({ messages }: MessageRendererProps) {
  return (
    <>
      {messages.map((message, messageIndex) => {
        // Handle tool response messages specially
        if (message.senderId === "assistant_tool_response") {
          // Extract tool type and content from the tool response message
          let toolSummary = "Executed tool";
          let IconComponent = TestTube; // Default icon

          if (message.message.includes("search_result:")) {
            // This is a web search result
            toolSummary = "Searched the web for information";
            IconComponent = Search;
          } else if (message.message.includes("Test tool called")) {
            // This is a test tool result
            toolSummary = "Ran test tool";
            IconComponent = TestTube;
          }

          return (
            <div className="w-full flex justify-start" key={message.id}>
              <div className="p-2 bg-background border rounded-lg mb-1 max-w-[65%]">
                <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  {toolSummary}
                </div>
              </div>
            </div>
          );
        }

        // Parse tool calls from message content
        const isStreaming = message.senderId === "assistant_pending";

        // Check if there's a subsequent tool response to mark tools as complete
        const hasSubsequentToolResponse = messages.slice(messageIndex + 1).some(
          (laterMessage) => laterMessage.senderId === "assistant_tool_response"
        );

        // Split content around tool calls to render them inline
        const renderMessageWithInlineTools = (content: string) => {
          const parts = [];
          let lastIndex = 0;

          // Find all tool call positions
          const toolCallPattern = /<(WEB_SEARCH_TOOL|call_test_tool)>(.*?)<\/\1>/g;
          let match;

          while ((match = toolCallPattern.exec(content)) !== null) {
            // Add content before the tool call
            if (match.index > lastIndex) {
              const beforeContent = content.slice(lastIndex, match.index);
              if (beforeContent.trim()) {
                parts.push(
                  <MarkdownRenderer key={`content-${lastIndex}`}>
                    {beforeContent}
                  </MarkdownRenderer>
                );
              }
            }

            // Add the tool call component
            const toolType = match[1];
            const toolContent = match[2];
            // Tool is complete if not streaming OR if there's a subsequent tool response
            const isToolComplete = !isStreaming || hasSubsequentToolResponse;

            parts.push(
              <ToolCallRenderer
                key={`tool-${match.index}`}
                toolCalls={[{
                  type: toolType,
                  content: toolContent,
                  isComplete: isToolComplete
                }]}
              />
            );

            lastIndex = match.index + match[0].length;
          }

          // Handle incomplete tool calls (during streaming)
          if (isStreaming) {
            const incompletePattern = /<(WEB_SEARCH_TOOL|call_test_tool)>([^<]*)$/;
            const incompleteMatch = content.match(incompletePattern);

            if (incompleteMatch && incompleteMatch.index !== undefined) {
              const beforeIncomplete = content.slice(lastIndex, incompleteMatch.index);
              if (beforeIncomplete.trim()) {
                parts.push(
                  <MarkdownRenderer key={`content-${lastIndex}`}>
                    {beforeIncomplete}
                  </MarkdownRenderer>
                );
              }

              parts.push(
                <ToolCallRenderer
                  key="incomplete-tool"
                  toolCalls={[{
                    type: incompleteMatch[1],
                    content: incompleteMatch[2],
                    isComplete: hasSubsequentToolResponse
                  }]}
                />
              );

              lastIndex = incompleteMatch.index + incompleteMatch[0].length;
            }
          }

          // Add remaining content after the last tool call
          if (lastIndex < content.length) {
            const remainingContent = content.slice(lastIndex);
            if (remainingContent.trim()) {
              parts.push(
                <MarkdownRenderer key={`content-${lastIndex}`}>
                  {remainingContent}
                </MarkdownRenderer>
              );
            }
          }

          return parts.length > 0 ? parts : (
            <MarkdownRenderer>{content}</MarkdownRenderer>
          );
        };

        return (
          <div
            className={`w-full flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            key={message.id}
          >
            <div className="p-2 bg-background border rounded-lg mb-1 max-w-[65%] prose">
              {message.reasoning ? (
                <Collapsible className="border mb-2 p-2 rounded-lg bg-muted">
                  <CollapsibleTrigger className="flex items-center">
                    Show Thinking <ChevronsUpDown size={14} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ReactMarkdown>{message.reasoning ?? ""}</ReactMarkdown>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              {/* Render message content with inline tool calls */}
              {renderMessageWithInlineTools(message.message)}

              {message.finish_reason && message.finish_reason !== "stop" ? (
                <Alert variant="destructive">
                  <AlertTitle>{message.finish_reason}</AlertTitle>
                </Alert>
              ) : null}
            </div>
          </div>
        );
      })}
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
