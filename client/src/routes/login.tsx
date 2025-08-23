import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loader from "@/components/ui/loader";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, redirect, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if ((await authClient.getSession()).data) {
      throw redirect({ to: "/chat" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });

  async function login() {
    setError("");
    setIsLoading(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (data) {
        navigate({ to: "/chat" });
      } else if (error) {
        setError(error.message ?? error.statusText);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      className={`flex h-full w-full items-center justify-center`}
      onSubmit={(e) => {
        login();
        e.preventDefault();
      }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center">
          {error ? (
            <Alert variant="error" className="mb-2">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          ) : null}
          <CardTitle>Log In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="x4132@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader />
                Loading...
              </>
            ) : (
              "Login"
            )}
          </Button>

          {/* TODO: ADD THIS BACK WITH A PROPER SETTINGS API <div className="text-center text-sm text-muted-foreground">
            or...
          </div>

          <Button variant="outline" className="w-full" onClick={signIn}>
            Login with Discord
          </Button> */}

          <CardAction className="w-full text-center">
            <span className="text-sm">Not Registered? </span>
            <Button variant="link" className="px-0" asChild>
              <Link to={"/signup"}>Sign Up</Link>
            </Button>
          </CardAction>
        </CardFooter>
      </Card>
    </form>
  );
}
