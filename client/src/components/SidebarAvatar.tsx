import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

export default function SidebarAvatar() {
  const session = authClient.useSession();

  return session.data ? (
    <Button variant="ghost" className="text-left justify-start items-center p-4 text-md flex-1 min-w-0">
      <Avatar className="flex-shrink-0">
        {session.data.user.image ? <AvatarImage src={session.data.user.image} /> : null}
        <AvatarFallback className="text-center">{session.data.user.name[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="truncate ml-2">{session.data.user.name}</div>
    </Button>
  ) : (
    <Button variant={"ghost"} className="grow text-left justify-start items-center p-4 text-md" asChild>
      <Link to="/login" params={{ redirect: "/chat" }}>
        <LogIn />
        <div>Log In</div>
      </Link>
    </Button>
  );
}
