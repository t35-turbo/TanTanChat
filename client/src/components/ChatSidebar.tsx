import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogIn, PanelLeftIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import fuzzysort from "fuzzysort";
import { Input } from "./ui/input";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query";
import { Chat, Chats, db } from "@/lib/db";
import { z } from "zod/v4-mini";
import ky from "ky";
import { queryClient } from "@/routes/__root";
import Settings from "./Settings";

export default function ChatSidebar() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const user_sess = authClient.useSession();

  const { chatId } = useParams({
    from: "/chat/$chatId",
    shouldThrow: false,
  }) ?? { chatId: undefined };
  const navigate = useNavigate();

  // CHROME PLEASE FINISH TEMPORAL ALREADY
  const chats = useQuery({
    queryKey: ["chats", user_sess.data?.user.id],
    queryFn: async () => {
      const userId = user_sess.data?.user.id;
      if (userId) {
        return z.object({ chats: Chats }).parse(await ky.get("/api/chats").json()).chats;
      } else {
        // we are not logged in, use idb
        return Chats.parse(await db.chats.toCollection().keys());
      }
    },
  });
  const deleteChat = useMutation({
    mutationFn: async (id: string) => {
      // TODO: add a confirmation
      if (chatId === id) {
        navigate({ to: "/chat" });
      }
      await ky.delete(`/api/chats/${id}`);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: ["chats"] }),
  });

  const filtered = fuzzysort
    .go(searchQuery, chats.data ?? [], { key: "title", all: true })
    .map((item) => item.obj)
    .filter((item) => item.id !== deleteChat.variables)
    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  const renderOutput = renderChatOutput(filtered, deleteChat);

  return (
    <>
      <Sidebar className="select-none">
        <SidebarHeader className="flex items-center content-center mt-2">
          <h1 className="text-2xl font-bold h-12 font-comic flex items-center">
            <div>Tan</div>
            <span className="inline-block rotate-180 self-end">T</span>
            <div>an</div>
          </h1>
          <Button variant={"default"} className="w-full cursor-pointer" asChild>
            <Link to="/chat">New Chat</Link>
          </Button>

          <div className="flex items-center border-b border-primary/65 mx-2">
            <SearchIcon size={16} />
            <Input
              type="text"
              className="border-0 outline-0 p-2 focus-visible:border-0 focus-visible:ring-0"
              placeholder="Search Chats..."
              value={searchQuery}
              onChange={(evt) => setSearchQuery(evt.target.value)}
            />
          </div>
        </SidebarHeader>
        <SidebarContent className="flex flex-col p-2 text-left">
          {chats.isSuccess ? renderOutput.map((item) => item.component) : null}
          {chats.isError ? "Error Loading Chats" : null}
          {chats.isPending ? "Loading Chats..." : null}
        </SidebarContent>
        <SidebarFooter className="flex flex-row items-center mb-4">
          {/* TODO: USER PAGE */}
          {user_sess.data ? (
            <Button variant="ghost" className="grow text-left justify-start items-center p-4 text-md">
              <Avatar>
                {user_sess.data.user.image ? <AvatarImage src={user_sess.data.user.image} /> : null}
                <AvatarFallback>{user_sess.data.user.name[0]}</AvatarFallback>
              </Avatar>
              <div>{user_sess.data.user.name}</div>
            </Button>
          ) : (
            <Button variant={"ghost"} className="grow text-left justify-start items-center p-4 text-md" asChild>
              <Link to="/login" params={{ redirect: "/chat" }}>
                <LogIn />
                <div>Log In</div>
              </Link>
            </Button>
          )}
          <Settings />
        </SidebarFooter>
      </Sidebar>

      <BetterTrigger />
    </>
  );
}

// lol
function BetterTrigger() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-12 fixed top-2 left-2 bg-background border z-10 group")}
      onClick={toggleSidebar}
    >
      <PanelLeftIcon className="transition-opacity duration-200 group-hover:opacity-0" />
      <span className="absolute font-mono transform translate-x-8 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {/Mac/i.test(navigator.userAgent) ? "⌘+B" : <span className="text-xs">CTRL+B</span>}
      </span>
      <span className="sr-only">CTRL-B</span>
    </Button>
  );
}

function timeDelta(date: Date) {
  let days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return "Today";
  } else if (days === 1) {
    return "Yesterday";
  } else if (days <= 7) {
    return "Last 7 Days";
  } else if (days <= 30) {
    return "Last 30 Days";
  } else {
    return "Older";
  }
}

function renderChatOutput(chats: Chat[], deleteChat: UseMutationResult<void, Error, string, unknown>) {
  let renderOutput: {
    component: React.ReactElement;
    item: { title: string; id: string; lastUpdated: Date } | null;
  }[] = chats.map((item) => {
    return {
      component: (
        <div key={item.id + item.lastUpdated.getTime()} className={`group/chat`}>
          <Button asChild variant={"ghost"} className="w-full max-w-full relative justify-start px-2">
            <Link to="/chat/$chatId" params={{ chatId: item.id }}>
              <span className="truncate" title={item.title}>{item.title}</span>
              <div className={`hidden group-hover/chat:block ml-auto right-0`}>
                {/* holy noncompliant html */}
                {/* TODO: add rename button */}
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    deleteChat.mutate(item.id);
                    e.preventDefault();
                  }}
                >
                  <XIcon />
                </Button>
              </div>
            </Link>
          </Button>
        </div>
      ),
      item,
    };
  });
  let lastUpdateValue = "";
  let pos = 0;
  for (let component of renderOutput) {
    if (component.item && timeDelta(component.item.lastUpdated) != lastUpdateValue) {
      let tDelta = timeDelta(component.item.lastUpdated);
      renderOutput.splice(pos, 0, {
        component: (
          <div className="text-accent-foreground font-bold border-b border-primary/25" key={tDelta}>
            {tDelta}
          </div>
        ),
        item: null,
      });

      lastUpdateValue = tDelta;
    }
    pos++;
  }

  if (renderOutput.length === 0) {
    renderOutput.push({
      component: <div key="emptyChats">You have no chats.</div>,
      item: null,
    });
  }

  return renderOutput;
}
