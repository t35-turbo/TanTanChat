import { queryClient } from "@/routes/__root";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

export const ChunkData = z.object({
  finish_reason: z.string(),
  content: z.string(),
  refusal: z.string(),
  reasoning: z.string(),
  tool_calls: z.any().optional(),
});
export type ChunkData = z.infer<typeof ChunkData>;

const RpcActiveMessage = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("activeMessage"),
  params: z.string(),
  id: z.undefined().optional(),
});
const RpcInvalidate = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("invalidate"),
  params: z.string(),
  id: z.undefined().optional(),
});
const RpcChunk = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("chunk"),
  params: ChunkData,
  id: z.union([z.string(), z.number()]),
});
const WSMessageSchema = z.union([RpcActiveMessage, RpcInvalidate, RpcChunk]);

interface WSEventMap {
  activeMessage: CustomEvent<{ messageId: string }>;
  invalidate: CustomEvent<{ cacheKey: string }>;
  chunk: CustomEvent<{ chunk: ChunkData; id: string }>;
}

/**
 * WSClient opens a WebSocket to the given URL and
 * re-emits incoming JSON-RPC messages as Typed Events.
 */
class WSClient extends EventTarget {
  private ws!: WebSocket;
  private url: string;
  private chatId?: string;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 250;
  private baseReconnectDelay = 5;

  constructor(chatId?: string) {
    super();
    this.chatId = chatId;
    const isDev = import.meta.env.MODE === "development";
    const protocol = isDev || window.location.protocol === "http:" ? "ws" : "wss";
    this.url = `${protocol}://${window.location.host}/api/chats/${chatId}/ws`;
    this.connect();
  }

  private connect() {
    if (this.ws) {
      this.close();
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      if (import.meta.env.MODE === "development") {
        console.log("event ws opened", this.url);
      }
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = (event) => {
      if (import.meta.env.MODE === "development") {
        console.log("event ws closed", event.code, event.reason);
      }
      if (event.code !== 1000) {
        // Not a normal closure
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.addEventListener("message", (evt) => {
      const parseRes = WSMessageSchema.safeParse(JSON.parse(evt.data));
      if (!parseRes.success) return;
      const msg = parseRes.data;
      let event: CustomEvent;
      switch (msg.method) {
        case "activeMessage":
          // we autosubscribe
          if (msg.params) {
            this.subscribe(msg.params);
          }
          event = new CustomEvent("activeMessage", {
            detail: { messageId: msg.params },
          });
          break;
        case "invalidate":
          event = new CustomEvent("invalidate", {
            detail: { cacheKey: msg.params },
          });
          break;
        case "chunk":
          event = new CustomEvent("chunk", {
            detail: { chunk: msg.params, id: String(msg.id) },
          });
          break;
      }

      this.dispatchEvent(event);
    });
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.maxReconnectDelay, this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1));

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Gracefully close the underlying WebSocket.
   */
  public close(code: number = 1000, reason: string = "close") {
    this.ws.close(code, reason);
  }

  /**
   * Disconnect from current WebSocket and connect to a new chat endpoint.
   */
  public reconnectTo(newChatId?: string) {
    this.chatId = newChatId;
    const isDev = import.meta.env.MODE === "development";
    const protocol = isDev || window.location.protocol === "http:" ? "ws" : "wss";
    this.url = `${protocol}://${window.location.host}/api/chats/${newChatId}/ws`;

    // Close existing connection
    this.ws.close(1000, "Switching chat");
    this.reconnectAttempts = 0;

    // Connect to new endpoint
    this.connect();
  }

  public subscribe(msgId: string) {
    this.ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "subscribe",
        params: msgId,
        id: msgId,
      }),
    );
  }
}

export const WSEventProvider = createContext<WSClient | null>(null);
export function WSProvider({ children, chatId }: { children: React.ReactNode; chatId?: string }) {
  const clientRef = useRef<WSClient>(new WSClient(chatId));

  // Handle chatId changes by reconnecting to new endpoint
  useEffect(() => {
    clientRef.current.reconnectTo(chatId);
  }, [chatId]);

  useEffect(() => {
    const invalidator = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ cacheKey: string }>;
      queryClient.invalidateQueries({ queryKey: [customEvt.detail.cacheKey] });
    };

    clientRef.current.addEventListener("invalidate", invalidator);

    return () => {
      clientRef.current?.removeEventListener("invalidate", invalidator);
      clientRef.current?.close();
    };
  }, []);

  return <WSEventProvider.Provider value={clientRef.current}>{children}</WSEventProvider.Provider>;
}

export function useActiveId() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const context = useContext(WSEventProvider);

  useEffect(() => {
    if (!context) return;

    const handleActive = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ messageId: string }>;
      setActiveId(customEvt.detail.messageId || null);
    };

    context.addEventListener("activeMessage", handleActive);

    return () => {
      context.removeEventListener("activeMessage", handleActive);
    };
  }, [context]);

  useEffect(() => {
    if (!activeId) {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    }
  }, [activeId]);

  return activeId;
}

export function useActiveMessage() {
  const activeId = useActiveId();
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const context = useContext(WSEventProvider);

  useEffect(() => {
    if (!context || !activeId) return;

    const handleChunk = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ chunk: ChunkData; id: string }>;
      if (customEvt.detail.id === activeId) {
        setChunks((prev) => [...prev, customEvt.detail.chunk]);
      }
    };

    context.addEventListener("chunk", handleChunk);

    return () => {
      context.removeEventListener("chunk", handleChunk);
    };
  }, [context, activeId]);

  return { chunks, setChunks };
}
