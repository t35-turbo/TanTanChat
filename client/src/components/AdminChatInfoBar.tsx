import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";

interface AdminChatInfoBarProps {
  chatId: string;
}

export function AdminChatInfoBar({ chatId }: AdminChatInfoBarProps) {
  const user_sess = authClient.useSession();

  const chatMetadata = useQuery(trpc.chats.getChatMetadata.queryOptions({ chatId }));

  // Don't show the bar if current user owns the chat
  if (chatMetadata.data && user_sess.data?.user && chatMetadata.data.userId === user_sess.data.user.id) {
    return null;
  }

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <div className="flex w-full items-center justify-between">
        <AlertDescription>
          {chatMetadata.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Viewing {chatMetadata.data.ownerName}'s chat:</span>
                <Badge variant="secondary">{chatMetadata.data.title}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                <span>Created: {formatDate(new Date(chatMetadata.data.created_at))}</span>
                <span>Last updated: {formatRelativeTime(new Date(chatMetadata.data.updated_at))}</span>
              </div>
            </>
          ) : (
            <span className="font-medium">Loading chat information...</span>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}
