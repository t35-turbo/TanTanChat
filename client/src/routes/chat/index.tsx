import { createFileRoute } from "@tanstack/react-router";
import { ChatUI } from "./$chatId";

export const Route = createFileRoute("/chat/")({
  component: ChatUI,
});