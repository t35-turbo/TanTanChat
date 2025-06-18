ALTER TYPE "public"."role" ADD VALUE 'tool';--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "tool_calls" text;