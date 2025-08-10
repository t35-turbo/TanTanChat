import { PageBack } from "@/components/settings/BackButtons";
import UserDetailsCard from "@/components/settings/UserDetailsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Calendar, Clock, ExternalLink, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin/users/$userId")({
  head: () => ({
    meta: [{ title: "Edit User | TanTan" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();

  const user = useQuery(trpc.admin.users.get.queryOptions(userId));

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />
      <h1 className="p-2 text-2xl font-bold">Editing user {user.data?.user.name ?? "Loading..."}</h1>

      <UserDetailsCard userId={userId} />
      <UserActivityCard userId={userId} />
    </div>
  );
}

function UserActivityCard({ userId }: { userId: string }) {
  const chatStats = useQuery(trpc.admin.users.getChatStats.queryOptions(userId));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          User Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Activity Stats */}
        {chatStats.data && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="bg-muted/20 flex items-center gap-3 rounded-lg p-3">
                <div className="bg-primary/10 rounded-md p-2">
                  <MessageSquare className="text-primary size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Total Chats</p>
                  <p className="text-2xl font-bold">{chatStats.data.totalChats}</p>
                </div>
              </div>
              <div className="bg-muted/20 flex items-center gap-3 rounded-lg p-3">
                <div className="bg-primary/10 rounded-md p-2">
                  <BarChart3 className="text-primary size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Total Messages</p>
                  <p className="text-2xl font-bold">{chatStats.data.totalMessages}</p>
                </div>
              </div>
              <div className="bg-muted/20 flex items-center gap-3 rounded-lg p-3">
                <div className="bg-primary/10 rounded-md p-2">
                  <Clock className="text-primary size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Last Activity</p>
                  <p className="text-sm font-semibold">
                    {chatStats.data.lastActivity
                      ? formatRelativeTime(new Date(chatStats.data.lastActivity))
                      : "No activity"}
                  </p>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        <UserChats userId={userId} />
      </CardContent>
    </Card>
  );
}

function UserChats({ userId }: { userId: string }) {
  const userChats = useInfiniteQuery({
    ...trpc.admin.users.getChats.infiniteQueryOptions({ userId }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // Flatten all pages into a single array
  const allChats = userChats.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Recent Chats</span>
          <Badge variant="secondary">{allChats.length}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {allChats.map((chat) => (
          <div
            key={chat.id}
            className="bg-muted/20 hover:bg-muted/40 flex items-start justify-between rounded-lg border p-3 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h4 className="truncate text-sm font-medium">{chat.title}</h4>
                <Badge variant="outline" className="text-xs">
                  {chat.messageCount} messages
                </Badge>
              </div>
              <div className="text-muted-foreground flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  <span>{formatDate(new Date(chat.updated_at))}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{formatRelativeTime(new Date(chat.updated_at))}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0" asChild>
              <Link to="/chat/$chatId" params={{ chatId: chat.id }} target="_blank">
                <ExternalLink className="size-3" />
                <span className="sr-only">View chat</span>
              </Link>
            </Button>
          </div>
        ))}

        {userChats.isPending && (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading chats...</span>
          </div>
        )}

        {userChats.isError && (
          <div className="flex items-center justify-center py-8">
            <span className="text-destructive">Error loading chats</span>
          </div>
        )}

        {userChats.isSuccess && allChats.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <MessageSquare className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground text-sm">No chats found</p>
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {userChats.hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => userChats.fetchNextPage()}
            disabled={userChats.isFetchingNextPage}
          >
            {userChats.isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </>
  );
}
