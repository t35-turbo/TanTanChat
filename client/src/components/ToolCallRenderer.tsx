import { LoaderCircle, Search, TestTube } from "lucide-react";

interface ToolCallData {
  type: string;
  content: string;
  isComplete: boolean;
}

interface ToolCallRendererProps {
  toolCalls: ToolCallData[];
}

const toolCallConfigs = {
  WEB_SEARCH_TOOL: {
    name: "Web Search",
    icon: Search,
    description: "Searching the web for information",
    color: "text-blue-500",
    bgColor: "bg-blue-50 border-blue-200",
  },
  call_test_tool: {
    name: "Test Tool",
    icon: TestTube,
    description: "Running test tool",
    color: "text-green-500",
    bgColor: "bg-green-50 border-green-200",
  },
} as const;

function ToolCallCard({ toolCall }: { toolCall: ToolCallData }) {
  const config = toolCallConfigs[toolCall.type as keyof typeof toolCallConfigs] || {
    name: toolCall.type,
    icon: TestTube,
    description: `Running ${toolCall.type}`,
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
  };

  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${config.bgColor}`}>
      <IconComponent className={`h-3 w-3 ${config.color}`} />
      <span className="font-medium">{config.name}</span>
      {toolCall.content && (
        <span className="text-xs opacity-70">"{toolCall.content}" &nbsp;<LoaderCircle className="h-3 w-3 animate-spin inline" /></span>
      )}
      {!toolCall.isComplete && (
        <LoaderCircle className="h-3 w-3 animate-spin" />
      )}
    </div>
  );
}

export function ToolCallRenderer({ toolCalls }: ToolCallRendererProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="tool-calls my-1">
      {toolCalls.map((toolCall, index) => (
        <ToolCallCard key={index} toolCall={toolCall} />
      ))}
    </div>
  );
}

// Parse tool calls from message content
export function parseToolCalls(content: string, isComplete: boolean = true): ToolCallData[] {
  const toolCalls: ToolCallData[] = [];
  
  // Define tool call patterns
  const patterns = [
    { regex: /<WEB_SEARCH_TOOL>(.*?)<\/WEB_SEARCH_TOOL>/gs, type: "WEB_SEARCH_TOOL" },
    { regex: /<call_test_tool>(.*?)<\/call_test_tool>/gs, type: "call_test_tool" },
  ];

  patterns.forEach(({ regex, type }) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      toolCalls.push({
        type,
        content: match[1]?.trim() || "",
        isComplete,
      });
    }
  });

  // Check for incomplete tool calls (opening tag without closing tag)
  if (!isComplete) {
    patterns.forEach(({ type }) => {
      const openingTag = `<${type}>`;
      const closingTag = `</${type}>`;
      
      if (content.includes(openingTag) && !content.includes(closingTag)) {
        const startIndex = content.lastIndexOf(openingTag);
        const partialContent = content.substring(startIndex + openingTag.length);
        
        toolCalls.push({
          type,
          content: partialContent.trim(),
          isComplete: false,
        });
      }
    });
  }

  return toolCalls;
}

// Remove tool call tags from content for clean display
export function removeToolCallTags(content: string): string {
  const patterns = [
    /<WEB_SEARCH_TOOL>.*?<\/WEB_SEARCH_TOOL>/gs,
    /<call_test_tool>.*?<\/call_test_tool>/gs,
  ];

  let cleanContent = content;
  patterns.forEach(pattern => {
    cleanContent = cleanContent.replace(pattern, '');
  });

  return cleanContent.trim();
}
