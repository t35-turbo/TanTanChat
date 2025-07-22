import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/input";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export default function DeleteAccountButton() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");

  async function deleteAccount() {
    await authClient.deleteUser({
      password: password,
      fetchOptions: {
        onSuccess: () => {
          toast.success("Account deleted successfully");
          navigate({ to: "/" });
        },
      },
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <TriangleAlert />
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
        <AlertDialogDescription className="">
          <p>This action is irreversible and will permanently delete your account and all data associated with it.</p>
          <p>
            <b>To Continue, please type your password below:</b>
          </p>
          <Input
            type="password"
            className="mt-1"
            placeholder={"Enter Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive hover:bg-destructive/70" onClick={deleteAccount}>
            Delete my Account.
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
