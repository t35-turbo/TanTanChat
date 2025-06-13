import ReactMarkdown from "react-markdown";
import { ChevronsUpDown } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Message } from "@/lib/db";

interface MessageRendererProps {
  messages: Message[];
}

export function MessageRenderer({ messages }: MessageRendererProps) {
  return (
    <>
      {messages.map((message) => {
        return (
          <div
            className={`w-full flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            key={message.id}
          >
            <div className="p-2 bg-background border rounded-lg mb-1 max-w-[65%] prose">
              {message.reasoning ? (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center">
                    Show Thinking <ChevronsUpDown size={14} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ReactMarkdown>{message.reasoning ?? ""}</ReactMarkdown>
                  </CollapsibleContent>
                </Collapsible>
              ) : null}

              <ReactMarkdown>{message.message}</ReactMarkdown>
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

export default MessageRenderer;
