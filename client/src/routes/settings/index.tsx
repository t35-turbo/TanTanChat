import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyInput } from "@/hooks/use-key-input";
import { useORKey } from "@/hooks/use-or-key";
import { useTheme } from "@/hooks/use-theme";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Info,
  KeyIcon,
  LogIn,
  LogOut,
  Palette,
  RefreshCw,
  TriangleAlert,
  User,
  Wrench,
} from "lucide-react";
import { SessionLoadingScreen } from "@/components/LoadingScreen";
import { __client, queryClient, trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import DeleteAccountButton from "@/components/settings/DeleteAccountButton";
import {PageBack} from "@/components/settings/BackButtons";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  const user_sess = authClient.useSession();
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const router = useRouter();
  const sidebar = useSidebar();

  useEffect(() => {
    // Only redirect if the session has finished loading and there's no authenticated user
    if (!user_sess.isPending && !user_sess.data && !user_sess.error) {
      navigate({ to: "/login" });
    }
  }, [user_sess.isPending, user_sess.data, user_sess.error, navigate]);

  // Show loading state while session is being determined
  if (user_sess.isPending) {
    return <SessionLoadingScreen />;
  }

  // Don't render the settings UI if not authenticated
  if (!user_sess.data && !user_sess.error) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex flex-col gap-2 p-4 w-full">
      <PageBack />

      <h1 className="text-2xl font-bold p-2">
        Settings for&nbsp;
        {user_sess.isPending ? "Loading User data..." : null}
        {user_sess.data?.user ? user_sess.data?.user.name : "Guest User"}
      </h1>

      <AccountCard />
      <AppearanceCard />
      <SystemPromptCard />
      <AboutCard />
    </div>
  );
}

function AccountCard() {
  const user_sess = authClient.useSession();
  const keySet = useORKey((state) => !!state.key);
  const setKey = useORKey((state) => state.setKey);
  const openKeyInput = useKeyInput((state) => state.open);
  const navigate = useNavigate();

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
          <Avatar className="size-12 flex">
            {user_sess && user_sess.data?.user?.image && <AvatarImage src={user_sess.data.user.image} />}
            <AvatarFallback className="text-lg">{user_sess.data?.user?.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium my-1">
              <span>{user_sess.data?.user?.name}</span>
              <Badge variant={"outline"} className="ml-2">
                User
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user_sess.data?.user?.email}</p>
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
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({ to: "/login" });
                  },
                },
              });
              setKey(null);
            }}
            className="flex items-center gap-2"
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        ) : null}

        <h2 className="font-bold mt-12">Danger Zone</h2>
        {user_sess.data ? <DeleteAccountButton /> : null}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`rounded-full w-12 h-12 bg-white hover:bg-white dark:bg-white hover:border-4 ${base === "white" ? "border-accent" : ""}`}
                  variant="outline"
                  onClick={() => setBase("white")}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>White</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`rounded-full w-12 h-12 bg-[#eff1f5] dark:bg[#eff1f5] hover:border-4 ${base === "latte" ? "border-accent" : ""}`}
                  variant="outline"
                  onClick={() => setBase("latte")}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Latte</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`rounded-full w-12 h-12 bg-[#303446] dark:bg-[#303446] hover:border-4 ${base === "frappe" ? "border-accent" : ""}`}
                  variant="outline"
                  onClick={() => setBase("frappe")}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Frappe</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`rounded-full w-12 h-12 bg-[#24273a] dark:bg-[#24273a] hover:border-4 ${base === "macchiato" ? "border-accent" : ""}`}
                  variant="outline"
                  onClick={() => setBase("macchiato")}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Macchiato</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`rounded-full w-12 h-12 bg-[#1e1e2e] dark:bg-[#1e1e2e] hover:border-4 ${base === "mocha" ? "border-accent" : ""}`}
                  variant="outline"
                  onClick={() => setBase("mocha")}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mocha</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`rounded-full w-12 h-12 bg-black hover:bg-black ${base === "dark" ? "border-accent" : ""}`}
                  variant="outline"
                  onClick={() => setBase("dark")}
                ></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dark</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {base !== "white" && base !== "dark" && (
            <>
              <p>Accent Color</p>
              <div className="flex flex-wrap gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-rosewater rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "rosewater" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("rosewater")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Rosewater</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-flamingo rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "flamingo" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("flamingo")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Flamingo</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-pink rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "pink" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("pink")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pink</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-mauve rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "mauve" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("mauve")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mauve</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-red rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "red" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("red")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Red</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-maroon rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "maroon" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("maroon")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maroon</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-yellow rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "yellow" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("yellow")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Yellow</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-green rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "green" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("green")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Green</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-teal rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "teal" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("teal")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Teal</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-sky rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "sky" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("sky")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sky</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-sapphire rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "sapphire" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("sapphire")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sapphire</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-blue rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "blue" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("blue")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Blue</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={`accent-lavender rounded-full w-12 h-12 bg-[rgba(var(--ctp-accent))] hover:bg-[rgba(var(--ctp-accent))] hover:border-4 ${color === "lavender" ? "border-accent" : ""}`}
                      variant="outline"
                      onClick={() => setColor("lavender")}
                    ></Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Lavender</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SystemPromptCard() {
  const user_sess = authClient.useSession();

  const settingsQuery = useQuery({
    ...trpc.settings.get.queryOptions(),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { name?: string | null; selfAttr?: string | null; traits?: string | null }) => {
      await __client.settings.update.mutate(updates);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() }),
  });

  let [name, selfAttr, traits] = ["", "", ""];
  if (settingsQuery.isPending) {
    ((name = "Loading..."), (selfAttr = "Loading..."), (traits = "Loading..."));
  } else if (settingsQuery.isError) {
    ((name = "Error loading data"), (selfAttr = "Error loading data"), (traits = "Error loading data"));
  } else {
    name = updateMutation.variables?.name || settingsQuery.data?.name || "";
    selfAttr = updateMutation.variables?.selfAttr || settingsQuery.data?.selfAttr || "";
    traits = updateMutation.variables?.traits || settingsQuery.data?.traits || "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-4" />
          Customization
          <div className="relative ml-auto mr-4">
            <div
              className={`absolute ${updateMutation.isPending ? "opacity-100" : "opacity-0"} ${updateMutation.isPending ? "" : "delay-150 duration-50"}`}
            >
              <RefreshCw className={`size-4 animate-spin`} />
            </div>
            <div
              className={`absolute ${updateMutation.isSuccess && !updateMutation.isPending ? "opacity-100" : "opacity-0"} ${updateMutation.isSuccess ? "delay-200" : ""}`}
            >
              <Check className={`size-4`} />
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="name">What Should We Call You?</Label>
        <Input
          name="name"
          placeholder="Enter Your Name..."
          value={name}
          onChange={(e) => updateMutation.mutate({ name: e.target.value })}
          onFocus={() => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() })}
        />
        <Label htmlFor="self-attr">What do you do?</Label>
        <Input
          name="self-attr"
          placeholder="Scientist, Writer, etc..."
          value={selfAttr}
          onChange={(e) => updateMutation.mutate({ selfAttr: e.target.value })}
          onFocus={() => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() })}
        />
        <Label htmlFor="traits">What Should We Consider When Responding?</Label>
        <Textarea
          name="traits"
          placeholder="Interests or Preferences to keep in mind"
          value={traits}
          onChange={(e) => updateMutation.mutate({ traits: e.target.value })}
          onFocus={() => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() })}
        />
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
        <p>
          © 2025 - {new Date().getFullYear()} 0x41*32 and Cocogoatmain/Pablonara. Made freely available via the MIT
          License.
        </p>
        <p>Clone Clone Clone &lt;3</p>
        <p>Shiroha Best Girl</p>
        <p>
          <a href="https://x4132.dev" className="underline">
            https://x4132.dev
          </a>
        </p>
        <p>
          <a href="https://archlinux.org/mirrors/pablonara.com" className="underline">
            https://archlinux.org/mirrors/pablonara.com
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
