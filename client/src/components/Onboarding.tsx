import { KeyIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useKeyInput } from "@/hooks/use-key-input";
import { useNavigate } from "@tanstack/react-router";

export default function Onboarding() {
  const openKeyInput = useKeyInput((state) => state.open);
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
          Key:
        </p>
        <Button onClick={openKeyInput} variant={"default"}>
          <KeyIcon />
          Set Key
        </Button>
        <p className="text-xs italic">You own your key. OpenRouter Keys are never stored on our servers.</p>
      </DialogContent>
    </Dialog>
  );
}
