import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogIn, PanelLeftIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { Link } from "@tanstack/react-router";
import fuzzysort from "fuzzysort";
import { Input } from "./ui/input";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function ChatSidebar() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const user_sess = authClient.useSession();

  // CHROME PLEASE FINISH TEMPORAL ALREADY
  const data = fuzzysort
    .go(
      searchQuery,
      [
        { title: "Test Chat", id: "asdf", lastUpdated: new Date() },
        { title: "Test Chat2", id: "asdf2", lastUpdated: new Date() },
        { title: "REALLY OLD CHAT", id: "reallyold", lastUpdated: new Date(0) },
      ],
      { key: "title", all: true },
    )
    .map((item) => item.obj);

  let renderOutput: {
    component: React.ReactElement;
    item: { title: string; id: string; lastUpdated: Date } | null;
  }[] = data.map((item) => {
    return {
      component: (
        <div key={item.id + item.lastUpdated.getTime()}>
          <Button
            asChild
            variant={"ghost"}
            className="w-full justify-start px-2"
          >
            <Link to="/chat/$chatId" params={{ chatId: item.id }}>
              {item.title}
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
    if (
      component.item &&
      timeDelta(component.item.lastUpdated) != lastUpdateValue
    ) {
      let tDelta = timeDelta(component.item.lastUpdated);
      renderOutput.splice(pos, 0, {
        component: (
          <div
            className="text-accent-foreground font-bold border-b border-primary/25"
            key={tDelta}
          >
            {tDelta}
          </div>
        ),
        item: null,
      });

      lastUpdateValue = tDelta;
    }
    pos++;
  }

  return (
    <>
      <Sidebar className="select-none">
        <SidebarHeader className="flex items-center content-center mt-2">
          <h1 className="text-2xl font-bold h-12">T3Clone</h1>
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
          {renderOutput.map((item) => item.component)}
        </SidebarContent>
        <SidebarFooter className="flex flex-row items-center mb-4">
          {/* TODO: USER PAGE */}
          {user_sess.data ? (
            <Button variant="ghost" className="grow text-left justify-start items-center p-4 text-md">
              <Avatar>
                {user_sess.data.user.image ? (
                  <AvatarImage src={user_sess.data.user.image} />
                ) : null}
                <AvatarFallback>{user_sess.data.user.name[0]}</AvatarFallback>
              </Avatar>
              <div>{user_sess.data.user.name}</div>
            </Button>
          ) : (
            <Button variant={"ghost"} className="grow text-left justify-start items-center p-4 text-md">
              <LogIn />
              <div>Log In</div>
            </Button>
          )}
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
      className={cn(
        "size-12 fixed top-2 left-2 bg-background border z-10 group",
      )}
      onClick={toggleSidebar}
    >
      <PanelLeftIcon className="transition-opacity duration-200 group-hover:opacity-0" />
      <span className="absolute font-mono transform translate-x-8 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {/Mac/i.test(navigator.userAgent) ? (
          "⌘+B"
        ) : (
          <span className="text-xs">CTRL+B</span>
        )}
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
