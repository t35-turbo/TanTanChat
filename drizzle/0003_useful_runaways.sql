CREATE TYPE "public"."role" AS ENUM('system', 'assistant', 'user');--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "role" "role" NOT NULL;