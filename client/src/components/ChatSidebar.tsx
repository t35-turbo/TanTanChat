import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { type Chat, queryClient, trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { type UseMutationResult, useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import fuzzysort from "fuzzysort";
import { Eraser, PanelLeftIcon, SearchIcon, Settings, TextCursor, XIcon } from "lucide-react";
import React, { useRef, useState } from "react";
import SidebarAvatar from "./SidebarAvatar";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu";
import { Input } from "./ui/input";
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
    <ContextMenu key={item.id + item.updated_at.getTime()}>
      <div className={`group/chat`}>
        <ContextMenuTrigger>
          <Button asChild variant={"ghost"} className="relative w-full max-w-full justify-start px-2">
            {renaming ? (
              <Input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={renameKeyHandler}
                ref={inputRef}
              />
            ) : (
              <Link
                to="/chat/$chatId"
                params={{ chatId: item.id }}
                activeOptions={{ exact: true }}
                activeProps={{
                  className: "bg-muted/50 font-medium",
                }}
                inactiveProps={{
                  className: "group-hover/chat:bg-muted/50 text-foreground/90",
                }}
              >
                <span className="truncate" title={item.title}>
                  {item.title}
                </span>
                <div className={`-mr-2 ml-auto hidden group-hover/chat:block`}>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      deleteChat.mutate({ chatId: item.id });
                      e.preventDefault();
                    }}
                    className="hover:bg-foreground/25"
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
            <TextCursor className="text-primary" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              deleteChat.mutate({ chatId: item.id });
            }}
          >
            <Eraser className="text-primary" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </div>
    </ContextMenu>
  );
}

export default function ChatSidebar() {
  const [searchQuery, setSearchQuery] = React.useState("");

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
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  const renderOutput = renderChatOutput(filtered, deleteChat, renameChat);

  return (
    <>
      <Sidebar className="select-none">
        <SidebarHeader className="mt-2 flex content-center items-center">
          <Logo />

          <Button variant={"default"} className="w-full cursor-pointer" asChild>
            <Link to="/chat">New Chat</Link>
          </Button>

          <div className="border-primary/65 mx-2 flex items-center border-b">
            <SearchIcon size={16} />
            <Input
              type="text"
              className="border-0 p-2 outline-0 focus-visible:border-0 focus-visible:ring-0"
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
        <SidebarFooter className="mb-4 flex w-full flex-row items-center">
          <SidebarAvatar />
          <Link to="/settings" replace={false}>
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
      className={cn("bg-background group fixed left-2 top-2 z-10 size-12 border")}
      onClick={toggleSidebar}
    >
      <PanelLeftIcon className="transition-opacity duration-200 group-hover:opacity-0" />
      <span className="absolute translate-x-8 transform font-mono opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {/Mac/i.test(navigator.userAgent) ? "⌘+B" : <span className="text-xs">CTRL+B</span>}
      </span>
      <span className="sr-only">CTRL-B</span>
    </Button>
  );
}

function timeDelta(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

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
  const renderOutput: {
    component: React.ReactElement;
    item: { title: string; id: string; updated_at: Date } | null;
  }[] = chats.map((item) => {
    return {
      component: (
        <ChatItem
          key={item.id + item.updated_at.getTime()}
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
  for (const component of renderOutput) {
    if (component.item && timeDelta(component.item.updated_at) !== lastUpdateValue) {
      const tDelta = timeDelta(component.item.updated_at);
      renderOutput.splice(pos, 0, {
        component: (
          <div className="text-accent-foreground border-primary/25 border-b font-bold" key={tDelta}>
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
