import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Label } from "@radix-ui/react-label";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/signup")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  async function login() {
    setError("");

    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }

    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: username,
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
          <CardTitle>Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid">
              <Label htmlFor="username">Name/Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="msvcredist2022"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="grid">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="0.at.x4132.dev@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid">
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
            <div className="grid">
              <div className="flex items-center">
                <Label htmlFor="password">Retype Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full">
            Sign Up
          </Button>
          {/* <Button variant="outline" className="w-full">
            Login with Discord
          </Button> */}

          <CardAction className="text-center w-full">
            <span className="text-sm">Already Registered? </span>
            <Button variant="link" className="px-0" asChild>
              <Link to={"/login"}>Log In</Link>
            </Button>
          </CardAction>
        </CardFooter>
      </Card>
    </form>
  );
}
