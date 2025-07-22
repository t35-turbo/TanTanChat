import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Eraser, LogIn, PanelLeftIcon, SearchIcon, Settings, TextCursor, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import fuzzysort from "fuzzysort";
import { Input } from "./ui/input";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query";
import ky from "ky";
import { queryClient, trpc, type Chat } from "@/lib/trpc";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu";
import Logo from "./ui/Logo";

interface ChatItemProps {
  item: Chat;
  deleteChat: UseMutationResult<boolean, any, { chatId: string }, undefined>;
  renameChat: UseMutationResult<void, Error, { chatId: string; name: string }, unknown>;
}

function ChatItem({ item, deleteChat, renameChat }: ChatItemProps) {
  const [renameInput, setRenameInput] = useState<string>("");
  const [renaming, setRenaming] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function renameKeyHandler(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.code === "Enter") {
      renameChat.mutate({ chatId: item.id, name: renameInput });
      setRenaming(false);
    } else if (e.code === "Escape") {
      setRenaming(false);
    }
  }

  return (
    <ContextMenu key={item.id + item.lastUpdated.getTime()}>
      <div className={`group/chat`}>
        <ContextMenuTrigger>
          <Button asChild variant={"ghost"} className="w-full max-w-full relative justify-start px-2">
            {renaming ? (
              <Input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={renameKeyHandler}
                ref={inputRef}
              />
            ) : (
              <Link to="/chat/$chatId" params={{ chatId: item.id }}>
                <span className="truncate" title={item.title}>
                  {item.title}
                </span>
                <div className={`hidden group-hover/chat:block ml-auto right-0`}>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      deleteChat.mutate({ chatId: item.id });
                      e.preventDefault();
                    }}
                  >
                    <XIcon />
                  </Button>
                </div>
              </Link>
            )}
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              setRenameInput(item.title);
              setRenaming(true);
            }}
          >
            <TextCursor />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              deleteChat.mutate({ chatId: item.id });
            }}
          >
            <Eraser />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </div>
    </ContextMenu>
  );
}

export default function ChatSidebar() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const user_sess = authClient.useSession();

  const { chatId } = useParams({
    from: "/chat/$chatId",
    shouldThrow: false,
  }) ?? { chatId: undefined };
  const navigate = useNavigate();

  // CHROME PLEASE FINISH TEMPORAL ALREADY
  const chats = useQuery(trpc.chats.listThreads.queryOptions());
  const deleteChat = useMutation(
    trpc.chats.deleteThread.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.chats.listThreads.queryKey() }),
    }),
  );

  const renameChat = useMutation(
    trpc.chats.renameThread.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.chats.listThreads.queryKey() }),
    }),
  );

  const filtered = fuzzysort
    .go(searchQuery, chats.data ?? [], { key: "title", all: true })
    .map((item) => item.obj)
    .filter((item) => item.id !== deleteChat.variables?.chatId)
    .map((item) => (item.id === renameChat.variables?.chatId ? { ...item, title: renameChat.variables?.name } : item))
    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  const renderOutput = renderChatOutput(filtered, deleteChat, renameChat);

  return (
    <>
      <Sidebar className="select-none">
        <SidebarHeader className="flex items-center content-center mt-2">
          <Logo />

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
        <SidebarFooter className="flex flex-row items-center mb-4 w-full">
          {user_sess.data ? (
            <Button variant="ghost" className="text-left justify-start items-center p-4 text-md flex-1 min-w-0">
              <Avatar className="flex-shrink-0">
                {user_sess.data.user.image ? <AvatarImage src={user_sess.data.user.image} /> : null}
                <AvatarFallback>{user_sess.data.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="truncate ml-2">{user_sess.data.user.name}</div>
            </Button>
          ) : (
            <Button variant={"ghost"} className="grow text-left justify-start items-center p-4 text-md" asChild>
              <Link to="/login" params={{ redirect: "/chat" }}>
                <LogIn />
                <div>Log In</div>
              </Link>
            </Button>
          )}
          <Link to="/settings">
            <Settings className="size-5" />
          </Link>
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

function renderChatOutput(
  chats: Chat[],
  deleteChat: UseMutationResult<boolean, any, { chatId: string }, undefined>,
  renameChat: UseMutationResult<void, any, { chatId: string; name: string }, unknown>,
) {
  let renderOutput: {
    component: React.ReactElement;
    item: { title: string; id: string; lastUpdated: Date } | null;
  }[] = chats.map((item) => {
    return {
      component: (
        <ChatItem
          key={item.id + item.lastUpdated.getTime()}
          item={item}
          deleteChat={deleteChat}
          renameChat={renameChat}
        />
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
