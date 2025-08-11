import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4-mini";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.optional(z.string()) }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetPasswordMut = useMutation({
    mutationFn: async ({ newPassword, token }: { newPassword: string; token: string }) => {
      if (!token) {
        throw new Error("Invalid or missing reset token");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const result = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to reset password");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Password reset successfully! Please sign in with your new password.");
      navigate({ to: "/login" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && confirmPassword && token) {
      resetPasswordMut.mutate({ newPassword, token });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-screen items-center justify-center space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {token ? (
            <>
              <CardTitle>Reset Your Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Invalid Reset Link</CardTitle>
              <CardDescription>The password reset link is invalid or has expired.</CardDescription>
            </>
          )}
        </CardHeader>
        {token && (
          <CardContent className="space-y-2">
            {resetPasswordMut.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resetPasswordMut.error.message}</AlertDescription>
              </Alert>
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </CardContent>
        )}
        <CardFooter>
          {token ? (
            <Button type="submit" className="w-full" disabled={resetPasswordMut.isPending}>
              {resetPasswordMut.isPending ? "Resetting Password..." : "Reset Password"}
            </Button>
          ) : (
            <Button asChild>
              <Link className="w-full" to="/login">
                Back to Login
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </form>
  );
}
