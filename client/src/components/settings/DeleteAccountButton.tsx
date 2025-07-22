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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.trim()) {
      deleteAccount();
    }
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
        <AlertDialogDescription asChild>
          <div>
            <p>This action is irreversible and will permanently delete your account and all data associated with it.</p>
            <form onSubmit={handleSubmit} className="mt-4">
              <label htmlFor="delete-password" className="block font-bold mb-2">
                To continue, please type your password below:
              </label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </form>
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-destructive hover:bg-destructive/70" 
            onClick={deleteAccount}
            disabled={!password.trim()}
          >
            Delete my Account.
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
