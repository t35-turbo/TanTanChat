import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function login() {
    setError("");
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    console.log(data, error);
    if (data) {
      navigate({ to: "/chat" });
    } else if (error) {
      setError(error.message ?? error.statusText);
    }
  }

  return (
    <form
      className={`flex justify-center items-center w-full h-full`}
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
          <Button type="submit" className="w-full">
            Login
          </Button>
          {/* <Button variant="outline" className="w-full">
            Login with Discord
          </Button> */}

          <CardAction className="text-center w-full">
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
