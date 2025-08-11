import { authClient } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

export default function SidebarAvatar() {
  const session = authClient.useSession();

  return session.data ? (
    <Button variant="ghost" className="text-md min-w-0 flex-1 items-center justify-start p-4 text-left">
      <Avatar className="flex-shrink-0">
        {session.data.user.image ? <AvatarImage src={session.data.user.image} /> : null}
        <AvatarFallback className="text-center">{session.data.user.name[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="ml-2 truncate">{session.data.user.name}</div>
    </Button>
  ) : (
    <Button variant={"ghost"} className="text-md grow items-center justify-start p-4 text-left" asChild>
      <Link to="/login" params={{ redirect: "/chat" }}>
        <LogIn />
        <div>Log In</div>
      </Link>
    </Button>
  );
}
