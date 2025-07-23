import { KeyIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useNavigate } from "@tanstack/react-router";

export default function Onboarding() {
  const navigate = useNavigate();

  return (
    <Dialog
      defaultOpen
      onOpenChange={(state) => {
        if (!state) navigate({ to: "/chat" });
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to TanTan Chat!</DialogTitle>
        </DialogHeader>
        <p>
          TanTan Chat is an easy-to-use chat application. All you have to do to get started is input your OpenRouter
        </p>
      </DialogContent>
    </Dialog>
  );
}
