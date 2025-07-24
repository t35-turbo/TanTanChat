import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useORKey } from "@/hooks/use-or-key";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Info, LogOut, Palette, RefreshCw, User, Wrench } from "lucide-react";
import { __client, queryClient, trpc, type AppRouter } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import DeleteAccountButton from "@/components/settings/DeleteAccountButton";
import { PageBack } from "@/components/settings/BackButtons";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { Switch } from "@/components/ui/switch";
import type { inferProcedureInput } from "@trpc/server";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  const user_sess = authClient.useSession();

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
  const setKey = useORKey((state) => state.setKey);
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
  const updateMutation = useMutation(trpc.settings.);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-4" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <p>Sync Across Devices</p>

          <Switch />
        </div>
        <ThemeSelector />
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
    mutationFn: async (updates: inferProcedureInput<AppRouter["settings"]["update"]>) => {
      await __client.settings.update.mutate(updates);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() }),
  });

  // i miss match expressions :( or some better pattern matching
  const [name, self_attr, traits] = (() => {
    if (settingsQuery.status === "pending") {
      return ["Loading...", "Loading...", "Loading..."];
    }
    if (settingsQuery.status === "error") {
      return ["Error loading data", "Error loading data", "Error loading data"];
    }
    return [
      updateMutation.variables?.name || settingsQuery.data?.name || "",
      updateMutation.variables?.self_attr || settingsQuery.data?.self_attr || "",
      updateMutation.variables?.traits || settingsQuery.data?.traits || "",
    ];
  })();

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
        <Label htmlFor="name">What Should the Assistant Call You?</Label>
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
          value={self_attr}
          onChange={(e) => updateMutation.mutate({ self_attr: e.target.value })}
          onFocus={() => queryClient.invalidateQueries({ queryKey: trpc.settings.get.queryKey() })}
        />
        <Label htmlFor="traits">What else should the Assistant consider when responding?</Label>
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
