import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

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
