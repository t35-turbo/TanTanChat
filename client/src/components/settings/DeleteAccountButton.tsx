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
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "../ui/input";

export default function DeleteAccountButton({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  const deleteAccountMut = useMutation({
    mutationFn: async (password?: string) => {
      if (userId) {
        // Admin deleting another user's account
        const result = await authClient.admin.removeUser({ userId });
        if (result.error) {
          throw new Error(result.error.message || "Failed to delete user account");
        }
        return result;
      } else {
        // User deleting their own account
        if (!password) {
          throw new Error("Password is required");
        }
        const result = await authClient.deleteUser({
          password: password,
        });
        if (result.error) {
          throw new Error(result.error.message || "Password incorrect or failed to delete account");
        }
        return result;
      }
    },
    onSuccess: () => {
      toast.success("Account deleted Successfully");
      if (userId) {
        navigate({ to: "/admin/users" });
      } else {
        navigate({ to: "/" });
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (userId || password.trim()) {
      deleteAccountMut.mutate(userId ? undefined : password);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={deleteAccountMut.isPending}>
          <TriangleAlert />
          {userId ? "Delete User" : "Delete Account"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>
          Are you sure you want to delete {userId ? "this user's account" : "your account"}?
        </AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div>
            <p>
              This action is irreversible and will permanently delete {userId ? "the user's" : "your"} account and all
              data associated with it.
            </p>
            {!userId && (
              <form onSubmit={handleSubmit} className="mt-4">
                <label htmlFor="delete-password" className="mb-2 block font-bold">
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
            )}
            {userId && (
              <div className="mt-4 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                <strong>Admin Action:</strong> You are about to permanently delete this user's account. This action
                cannot be undone.
              </div>
            )}
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/70"
            onClick={() => deleteAccountMut.mutate(userId ? undefined : password)}
            disabled={deleteAccountMut.isPending || (!userId && !password.trim())}
          >
            {deleteAccountMut.isPending ? "Deleting..." : userId ? "Delete User Account" : "Delete my Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
