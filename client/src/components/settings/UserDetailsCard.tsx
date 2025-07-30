import DeleteAccountButton from "@/components/settings/DeleteAccountButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";
import { Separator } from "@/components/ui/separator";
import { useORKey } from "@/hooks/use-or-key";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle, KeyRound, LogOut, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UserDetailsCard({ userId }: { userId?: string }) {
  const session = useQuery(trpc.users.withRole.queryOptions(userId));
  const setKey = useORKey((state) => state.setKey);
  const navigate = useNavigate();

  const logOutMut = useMutation({
    mutationFn: async () => {
      if (userId) {
        const result = await authClient.admin.revokeAllSessions({ userId });
        if (result.error) {
          throw new Error(result.error.message || "Failed to revoke sessions");
        }
        return result;
      } else {
        const result = await authClient.signOut();
        if (result.error) {
          throw new Error(result.error.message || "Failed to sign out");
        }
        setKey(null);
        navigate({ to: "/login" });
        return result;
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-4" />
          Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="flex size-12 cursor-default select-none">
            {session?.data?.image && <AvatarImage src={session.data?.image} />}
            <AvatarFallback className="text-lg">{session.data?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="my-1 flex items-center gap-2 font-medium">
              <span>{session.data?.name}</span>
              <Badge className="select-none" variant={"outline"}>
                User
              </Badge>
              <ChangeNameDialog userId={userId} />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span>{session.data?.email}</span>
              <ChangeEmailDialog userId={userId} />
            </div>
          </div>
        </div>

        <Separator />

        {session.data && (
          <Button variant="outline" onClick={() => logOutMut.mutate()} className="flex items-center gap-2">
            <LogOut className="size-4" />
            {userId ? "Revoke Sessions" : "Sign Out"}
            {logOutMut.isPending && <Loader />}
          </Button>
        )}

        <h2 className="mt-12 font-bold">Danger Zone</h2>
        {session.data ? (
          <div className="flex gap-2">
            <ChangePasswordDialog userId={userId} />
            <DeleteAccountButton userId={userId} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChangeNameDialog({ userId }: { userId?: string }) {
  const session = useQuery(trpc.users.withRole.queryOptions(userId));

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const updateNameMut = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim()) {
        throw new Error("Name cannot be empty");
      }
      const result = await (() =>
        userId ? authClient.admin.updateUserName({ userId, name }) : authClient.updateUser({ name }))();

      if (result.error) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      setOpen(false);
    },
    onSettled: () => session.refetch(),
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setName(session.data?.name ?? "");
      updateNameMut.reset(); // Clear any previous errors
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="text-primary hover:text-primary/80 text-xs underline">Change Name</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Name</DialogTitle>
          <DialogDescription>Update your display name</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            updateNameMut.mutate(name.trim());
          }}
          className="space-y-4"
        >
          {updateNameMut.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{updateNameMut.error.message || "Failed to update name"}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateNameMut.isPending || !name.trim()}>
              {updateNameMut.isPending ? "Updating..." : "Update Name"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeEmailDialog({ userId }: { userId?: string }) {
  const session = useQuery(trpc.users.withRole.queryOptions(userId));

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const updateEmailMut = useMutation({
    mutationFn: async (email: string) => {
      if (!email.trim()) {
        throw new Error("Email cannot be empty");
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error("Invalid email format");
      }

      const result = await (() =>
        userId ? authClient.admin.updateUserEmail({ userId, email }) : authClient.changeEmail({ newEmail: email }))();

      if (result.error) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      setOpen(false);
    },
    onSettled: () => session.refetch(),
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setEmail(session.data?.email || "");
      updateEmailMut.reset(); // Clear any previous errors
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="text-primary hover:text-primary/80 text-xs underline">Change Email</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>Update your email address. You may need to verify the new email.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateEmailMut.mutate(email.trim());
          }}
          className="space-y-4"
        >
          {updateEmailMut.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{updateEmailMut.error.message || "Failed to update email"}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEmailMut.isPending || !email.trim() || !/\S+@\S+\.\S+/.test(email)}>
              {updateEmailMut.isPending ? "Updating..." : "Update Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ userId }: { userId?: string }) {
  const [open, stateSetOpen] = useState(false);
  const [currentPassword, setCurPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [conPassword, setConPassword] = useState("");

  const changePasswd = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword?: string; newPassword: string }) => {
      if (newPassword !== conPassword) {
        throw new Error("Passwords do not match");
      }

      const result = await (() =>
        userId
          ? authClient.admin.setUserPassword({ userId, newPassword })
          : authClient.changePassword({
              newPassword,
              currentPassword: currentPassword!,
              revokeOtherSessions: true,
            }))();

      if (result.error) {
        throw new Error(result.error.message ?? `${result.error.status}: ${result.error.statusText}`);
      }

      return result;
    },
    onSuccess: () => {
      setCurPassword("");
      setConPassword("");
      setNewPassword("");
      setOpen(false);
    },
  });

  const getResetLink = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const result = await authClient.admin.generatePasswordResetLink({
        userId,
        sendEmail: false,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to generate reset link");
      }

      return `${window.location.origin}${result.data.resetLink}`;
    },
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getResetLink.data ?? "");
      toast.success("Reset link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  function setOpen(state: boolean) {
    setCurPassword("");
    setNewPassword("");
    setConPassword("");
    changePasswd.reset();
    getResetLink.reset();
    stateSetOpen(state);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <KeyRound className="size-4" />
          {userId ? "Reset Password" : "Change Password"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{userId ? "Reset User Password" : "Change Password"}</DialogTitle>
          {userId && (
            <DialogDescription>
              Generate a password reset link for this user or set a new password directly.
            </DialogDescription>
          )}
        </DialogHeader>

        {getResetLink.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{getResetLink.error.message || "Failed to generate reset link"}</AlertDescription>
          </Alert>
        )}

        {getResetLink.data && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Reset link generated successfully!</AlertTitle>
              <AlertDescription>
                Share this link with the user. This link will expire in 1 hour and can only be used once.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Password Reset Link</Label>
              <div className="flex gap-2">
                <Input value={getResetLink.data} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={copyToClipboard}>
                  Copy
                </Button>
              </div>
            </div>
          </div>
        )}

        {userId && !getResetLink.isSuccess && (
          <div className="space-y-4">
            <Button onClick={() => getResetLink.mutate()} disabled={getResetLink.isPending} className="w-full">
              {getResetLink.isPending ? "Generating..." : "Generate Reset Link"}
            </Button>
          </div>
        )}

        {userId && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">Or set password directly</span>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changePasswd.mutate({ currentPassword, newPassword });
          }}
          className="space-y-2"
        >
          {changePasswd.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{changePasswd.error.message || "Failed to update password"}</AlertDescription>
            </Alert>
          )}

          {!userId && (
            <>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </>
          )}

          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />

          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={conPassword}
            onChange={(e) => setConPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => stateSetOpen(false)}>
              {getResetLink.isSuccess ? "Done" : "Cancel"}
            </Button>
            {!getResetLink.isSuccess && (
              <Button type="submit" disabled={changePasswd.isPending}>
                {changePasswd.isPending ? "Updating..." : "Update Password"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
