ALTER TABLE "chat_messages" ADD COLUMN "files" text[];--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "mime" text NOT NULL;