import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useORKey } from "@/hooks/use-or-key";
import { Settings as SettingsIcon, Palette, Key, User, Info, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function Settings() {
  const [open, setOpen] = useState(false);
  // const { theme, setTheme } = useTheme();
  const { key: orKey, setKey: setORKey } = useORKey();
  const user_sess = authClient.useSession();
  const [tempKey, setTempKey] = useState("");

  const handleSaveKey = () => {
    if (tempKey.trim()) {
      setORKey(tempKey.trim());
      setTempKey("");
    }
  };

  const handleClearKey = () => {
    setORKey("");
    setTempKey("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <SettingsIcon className="size-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Section */}
          {user_sess.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-4" />
                  Account
                </CardTitle>
                <CardDescription>
                  Your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12">
                    {user_sess.data.user.image && (
                      <AvatarImage src={user_sess.data.user.image} />
                    )}
                    <AvatarFallback className="text-lg">
                      {user_sess.data.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user_sess.data.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user_sess.data.user.email}
                    </p>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  onClick={async () => {
                    await authClient.signOut();
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-4" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of TanTan Chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme-selector">Theme</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {/* {themes.find(t => t.value === theme)?.label || "Select theme"} */}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {/* <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as any)}>
                      {themes.map((themeOption) => (
                        <DropdownMenuRadioItem
                          key={themeOption.value}
                          value={themeOption.value}
                        >
                          {themeOption.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* OpenRouter API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="size-4" />
                OpenRouter API Key
              </CardTitle>
              <CardDescription>
                Your API key is stored locally and never saved on our server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-or-xxxxxxxxxxxxxx"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                  />
                  <Button onClick={handleSaveKey} disabled={!tempKey.trim()}>
                    Save
                  </Button>
                </div>
              </div>

              {orKey && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">
                    API key is configured
                  </span>
                  <Button variant="outline" size="sm" onClick={handleClearKey}>
                    Clear Key
                  </Button>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Don't have an API key?</p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const pkce_sec = crypto.randomUUID();
                    localStorage.setItem("pkce_sec", pkce_sec);

                    // Helper function for PKCE challenge
                    const createSHA256CodeChallenge = async (code: string) => {
                      const encoder = new TextEncoder();
                      const data = encoder.encode(code);
                      const hash = await crypto.subtle.digest('SHA-256', data);
                      return btoa(String.fromCharCode(...new Uint8Array(hash)))
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=/g, '');
                    };

                    const sha_chal = await createSHA256CodeChallenge(pkce_sec);
                    const auth_url = `https://openrouter.ai/auth?callback_url=${location.origin}/or_auth&code_challenge=${sha_chal}&code_challenge_method=S256`;
                    location.assign(auth_url);
                  }}
                  className="w-full"
                >
                  Get API Key from OpenRouter (OAuth)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <p><strong>TanTan Chat</strong></p>
                <p className="text-muted-foreground">
                  CLONE CLONE CLONE
                </p>
                <p className="text-muted-foreground">
                Shiroha best girl
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Settings;
