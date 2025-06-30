import { createContext, useContext } from "react";
import { z } from "zod";

const ChunkData = z.object({
  finish_reason: z.string(),
  content: z.string(),
  refusal: z.string(),
  reasoning: z.string(),
  tool_calls: z.any().optional(),
});
type ChunkData = z.infer<typeof ChunkData>;

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

class ActiveMessageEvent extends Event {
  public readonly messageId: string;
  constructor(messageId: string) {
    super("activeMessage");
    this.messageId = messageId;
  }
}

class InvalidateEvent extends Event {
  public readonly cacheKey: string;
  constructor(cacheKey: string) {
    super("invalidate");
    this.cacheKey = cacheKey;
  }
}

class ChunkEvent extends Event {
  public readonly chunk: ChunkData;
  public readonly id: string;
  constructor(chunk: ChunkData, id: string) {
    super("chunk");
    this.chunk = chunk;
    this.id = id;
  }
}

/**
 * WSClient opens a WebSocket to the given URL and
 * re-emits incoming JSON-RPC messages as Typed Events.
 */
class WSClient extends EventTarget {
  private ws: WebSocket;

  constructor(chatId?: string) {
    super();
    const isDev = import.meta.env.MODE === "development";
    const protocol = isDev || window.location.protocol === "http:" ? "ws" : "wss";
    const url = `${protocol}://${window.location.host}/api/chats/${chatId}/ws`;
    this.ws = new WebSocket(url);

    this.ws.addEventListener("message", (evt) => {
      const parseRes = WSMessageSchema.safeParse(JSON.parse(evt.data));
      if (!parseRes.success) return;
      const msg = parseRes.data;
      let event: Event;
      switch (msg.method) {
        case "activeMessage":
          event = new ActiveMessageEvent(msg.params);
          break;
        case "invalidate":
          event = new InvalidateEvent(msg.params);
          break;
        case "chunk":
          event = new ChunkEvent(msg.params, String(msg.id));
          break;
      }
      this.dispatchEvent(event);
    });
  }

  /**
   * Gracefully close the underlying WebSocket.
   */
  public close(code?: number, reason?: string) {
    this.ws.close(code, reason);
  }
}

export const WSEventProvider = createContext(new WSClient());
export const useWS = function () {
  return useContext(WSEventProvider);
};