import { z } from "zod";

/** Payload is the new active message ID */
export const ActiveMessageEventSchema = z.string();

/** Payload is the cache key to invalidate */
export const InvalidateEventSchema = z.string();

/** One piece of streaming data from the AI completion */
export const ChunkDataSchema = z.object({
  finish_reason: z.string(),
  content: z.string(),
  refusal: z.string(),
  reasoning: z.string(),
  tool_calls: z.any(),
});

/** Payload is the streaming chunk plus the message ID */
export const ChunkEventSchema = z.object({
  chunk: ChunkDataSchema,
  id: z.string(),
});

// Type exports
export type ActiveMessageEvent = z.infer<typeof ActiveMessageEventSchema>;
export type InvalidateEvent = z.infer<typeof InvalidateEventSchema>;
export type ChunkEvent = z.infer<typeof ChunkEventSchema>;