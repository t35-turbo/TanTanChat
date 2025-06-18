CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"hash" text NOT NULL,
	"owned_by" text NOT NULL,
	"on_s3" boolean NOT NULL,
	"file_path" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('system', 'assistant', 'user');--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owned_by_user_id_fk" FOREIGN KEY ("owned_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" DROP COLUMN "tool_calls";