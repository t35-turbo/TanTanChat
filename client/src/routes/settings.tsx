import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useKeyInput } from "@/hooks/use-key-input";
import { useORKey } from "@/hooks/use-or-key";
import { useTheme } from "@/hooks/use-theme";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, Link, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, Info, KeyIcon, LogIn, LogOut, Palette, User } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const user_sess = authClient.useSession();
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button
        variant="ghost"
        className="max-w-32"
        onClick={() => {
          if (canGoBack) {
            router.history.back();
          } else {
            navigate({ to: "/" });
          }
        }}
      >
        <ArrowLeftIcon />
        Back to chat
      </Button>

      <h1 className="text-2xl font-bold p-2 md:mt-8">
        Settings for&nbsp;
        {user_sess.isPending ? "Loading User data..." : null}
        {user_sess.data?.user ? user_sess.data?.user.name : "Guest User"}
      </h1>

      <AccountCard />
      <AppearanceCard />
      <AboutCard />
    </div>
  );
}

function AccountCard() {
  const user_sess = authClient.useSession();
  const keySet = useORKey((state) => !!state.key);
  const openKeyInput = useKeyInput((state) => state.open);

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
          <Avatar className="size-12">
            {user_sess && user_sess.data?.user?.image && <AvatarImage src={user_sess.data.user.image} />}
            <AvatarFallback className="text-lg">{user_sess.data?.user?.name?.[0] || "G"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{user_sess.data?.user?.name || "Guest User"}</p>
            <p className="text-sm text-muted-foreground">{user_sess.data?.user?.email || "Unknown Email"}</p>
          </div>
        </div>

        <Separator />
        <p>
          OpenRouter API Key: <b>{keySet ? "Activated" : "Not Set"}</b>
        </p>

        <Button onClick={openKeyInput} variant={"default"}>
          <KeyIcon />
          Set Key
        </Button>

        <Separator />

        {user_sess.data ? (
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut();
            }}
            className="w-full flex items-center gap-2"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        ) : null}
        {user_sess.isPending || user_sess.error ? (
          <Button variant="outline" disabled className="w-full flex items-center gap-2">
            {user_sess.isPending ? "Loading..." : `Error: ${user_sess.error?.message}`}
          </Button>
        ) : null}
        {!user_sess.isPending && !user_sess.error && !user_sess.data ? (
          <Button variant="outline" asChild className="w-full flex items-center gap-2">
            <Link to="/login">
              <LogIn className="size-4" />
              Log in
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
function AppearanceCard() {
  const base = useTheme((state) => state.base);
  const color = useTheme((state) => state.color);
  const setBase = useTheme((state) => state.setBase);
  const setColor = useTheme((state) => state.setColor);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-4" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p>Base Theme</p>
          <div className="flex flex-wrap gap-2">
            <Button
              className={`rounded-full w-12 h-12 bg-white hover:bg-white dark:bg-white hover:border-4 ${base === "white" ? "border-accent" : ""}`}
              variant="outline"
              title="White"
              onClick={() => setBase("white")}
            ></Button>
            <Button
              className={`rounded-full w-12 h-12 bg-[#eff1f5] dark:bg[#eff1f5] hover:border-4 ${base === "latte" ? "border-accent" : ""}`}
              variant="outline"
              title="Latte"
              onClick={() => setBase("latte")}
            ></Button>
            <Button
              className={`rounded-full w-12 h-12 bg-[#303446] dark:bg-[#303446] hover:border-4 ${base === "frappe" ? "border-accent" : ""}`}
              variant="outline"
              title="Frappe"
              onClick={() => setBase("frappe")}
            ></Button>
            <Button
              className={`rounded-full w-12 h-12 bg-[#24273a] dark:bg-[#24273a] hover:border-4 ${base === "macchiato" ? "border-accent" : ""}`}
              variant="outline"
              title="Macchiato"
              onClick={() => setBase("macchiato")}
            ></Button>
            <Button
              className={`rounded-full w-12 h-12 bg-[#1e1e2e] dark:bg-[#1e1e2e] hover:border-4 ${base === "mocha" ? "border-accent" : ""}`}
              variant="outline"
              title="Mocha"
              onClick={() => setBase("mocha")}
            ></Button>
            <Button
              className={`rounded-full w-12 h-12 bg-black hover:bg-black ${base === "dark" ? "border-accent" : ""}`}
              variant="outline"
              title="Dark"
              onClick={() => setBase("dark")}
            ></Button>
          </div>
          {base !== "white" && base !== "dark" && (
            <>
              <p>Accent Color</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className={`accent-rosewater rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "rosewater" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Rosewater"
                  onClick={() => setColor("rosewater")}
                ></Button>
                <Button
                  className={`accent-flamingo rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "flamingo" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Flamingo"
                  onClick={() => setColor("flamingo")}
                ></Button>
                <Button
                  className={`accent-pink rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "pink" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Pink"
                  onClick={() => setColor("pink")}
                ></Button>
                <Button
                  className={`accent-mauve rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "mauve" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Mauve"
                  onClick={() => setColor("mauve")}
                ></Button>
                <Button
                  className={`accent-red rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "red" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Red"
                  onClick={() => setColor("red")}
                ></Button>
                <Button
                  className={`accent-maroon rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "maroon" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Maroon"
                  onClick={() => setColor("maroon")}
                ></Button>
                <Button
                  className={`accent-yellow rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "yellow" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Yellow"
                  onClick={() => setColor("yellow")}
                ></Button>
                <Button
                  className={`accent-green rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "green" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Green"
                  onClick={() => setColor("green")}
                ></Button>
                <Button
                  className={`accent-teal rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "teal" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Teal"
                  onClick={() => setColor("teal")}
                ></Button>
                <Button
                  className={`accent-sky rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "sky" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Sky"
                  onClick={() => setColor("sky")}
                ></Button>
                <Button
                  className={`accent-sapphire rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "sapphire" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Sapphire"
                  onClick={() => setColor("sapphire")}
                ></Button>
                <Button
                  className={`accent-blue rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "blue" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Blue"
                  onClick={() => setColor("blue")}
                ></Button>
                <Button
                  className={`accent-lavender rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "lavender" ? "border-accent" : ""}`}
                  variant="outline"
                  title="Lavender"
                  onClick={() => setColor("lavender")}
                ></Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AboutCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-4" />
          About
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>© 2025 - {new Date().getFullYear()} 0x41*32 and Cocogoatmain. Made freely available via the MIT License.</p>
        <p>Clone Clone Clone &lt;3</p>
        <p>Shiroha Best Girl</p>
        <p>
          <a href="https://x4132.dev" className="underline">
            https://x4132.dev
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
