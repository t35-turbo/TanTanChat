import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useKeyInput } from "@/hooks/use-key-input";
import { useORKey } from "@/hooks/use-or-key";
import { useTheme } from "@/hooks/use-theme";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import ky from "ky";
import { ArrowLeftIcon, Info, KeyIcon, LogIn, LogOut, Palette, User, Wrench } from "lucide-react";
import { z } from "zod/v4-mini";
import { queryClient } from "./__root";

export const getUserSetting = async (key: string, userId?: string) => {
  if (!userId) return ""; // TODO: Dexie Db for logged out users
  return z.object({ value: z.nullable(z.string()) }).parse(await ky.get(`/api/user/settings/${key}`).json())?.value;
};

export const Route = createFileRoute("/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const user_sess = authClient.useSession();
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const router = useRouter();

  if (!user_sess.data && !user_sess.isPending && !user_sess.error) {
    navigate({ to: "/login" });
  }

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
              await authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({ to: "/login" });
                  },
                },
              });
              setKey(null);
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
function SystemPromptCard() {
  const user_sess = authClient.useSession();

  const nameQ = useQuery({
    queryKey: ["name", user_sess?.data?.user?.id],
    queryFn: () => getUserSetting("name", user_sess?.data?.user?.id),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const selfAttrQ = useQuery({
    queryKey: ["self-attr", user_sess?.data?.user?.id],
    queryFn: () => getUserSetting("self-attr", user_sess?.data?.user?.id),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const traitsQ = useQuery({
    queryKey: ["traits", user_sess?.data?.user?.id],
    queryFn: () => getUserSetting("traits", user_sess?.data?.user?.id),
    enabled: !user_sess.isPending && !user_sess.error,
  });

  const nameMut = useMutation({
    mutationFn: async (newName: string) => {
      return await ky
        .put(`/api/user/settings/name`, {
          json: { value: newName },
        })
        .json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["name"] }),
  });

  const selfAttrMut = useMutation({
    mutationFn: async (newSelfAttr: string) => {
      return await ky
        .put(`/api/user/settings/self-attr`, {
          json: { value: newSelfAttr },
        })
        .json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["self-attr"] }),
  });

  const traitsMut = useMutation({
    mutationFn: async (newTraits: string) => {
      return await ky
        .put(`/api/user/settings/traits`, {
          json: { value: newTraits },
        })
        .json();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["traits"] }),
  });

  let name = "";
  if (nameQ.isPending) {
    name = "Loading...";
  } else if (nameQ.isError) {
    name = "Error loading data";
  } else if (nameQ.isSuccess) {
    name = nameQ.data || "";
  }

  if (nameMut.isPending && nameMut.variables) {
    name = nameMut.variables;
  }

  let selfAttr = "";
  if (selfAttrQ.isPending) {
    selfAttr = "Loading...";
  } else if (selfAttrQ.isError) {
    selfAttr = "Error loading data";
  } else if (selfAttrQ.isSuccess) {
    selfAttr = selfAttrQ.data || "";
  }

  if (selfAttrMut.isPending && selfAttrMut.variables) {
    selfAttr = selfAttrMut.variables;
  }

  let traits = "";
  if (traitsQ.isPending) {
    traits = "Loading...";
  } else if (traitsQ.isError) {
    traits = "Error loading data";
  } else if (traitsQ.isSuccess) {
    traits = traitsQ.data || "";
  }

  if (traitsMut.isPending && traitsMut.variables) {
    traits = traitsMut.variables;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-4" />
          Customization
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="name">What Should We Call You?</Label>
        <Input
          name="name"
          placeholder="Enter Your Name..."
          value={name}
          onChange={(e) => nameMut.mutate(e.target.value)}
          onFocus={() => queryClient.invalidateQueries({ queryKey: ["name"] })}
        />
        <Label htmlFor="self-attr">What do you do?</Label>
        <Input
          name="self-attr"
          placeholder="Scientist, Writer, etc..."
          value={selfAttr}
          onChange={(e) => selfAttrMut.mutate(e.target.value)}
          onFocus={() => queryClient.invalidateQueries({ queryKey: ["self-attr"] })}
        />
        <Label htmlFor="traits">What Should We Consider When Responding?</Label>
        <Textarea
          name="traits"
          placeholder="Interests or Preferences to keep in mind"
          value={traits}
          onChange={(e) => traitsMut.mutate(e.target.value)}
          onFocus={() => queryClient.invalidateQueries({ queryKey: ["traits"] })}
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
