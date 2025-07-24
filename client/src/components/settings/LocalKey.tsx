import { Buffer } from "buffer";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { useORKey } from "@/hooks/use-or-key";

export function LocalKey() {
  const key = useORKey((state) => state.key);

  return (
    <TableRow className="group">
      <TableCell>Local OpenRouter</TableCell>
      <TableCell>OpenAI</TableCell>
      <TableCell>https://openrouter.ai/api/v1</TableCell>
      <TableCell>{key ? key.slice(0, 10) + "•".repeat(20) : "Not Set"}</TableCell>
      <TableCell>
        <Dialog>
          <DialogTrigger>
            <Pencil className={`size-4 text-foreground/50 group-hover:text-foreground`} />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>Edit Local OpenRouter Key</DialogHeader>
            <LocalKeyInput />
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

function LocalKeyInput() {
  const setKey = useORKey((state) => state.setKey);
  const [key, setKeyLocal] = useState("");

  async function or_pkce() {
    const pkce_sec = crypto.randomUUID();
    localStorage.setItem("pkce_sec", pkce_sec);
    const sha_chal = await createSHA256CodeChallenge(pkce_sec);

    // using a template string is NOT a security issue in this case
    const auth_url = `https://openrouter.ai/auth?callback_url=${location.origin}/or_auth&code_challenge=${sha_chal}&code_challenge_method=S256`;
    location.assign(auth_url);
  }

  return (
    <div className="space-y-2">
      <Button className="flex items-center" onClick={or_pkce}>
        <OpenRouterLogo /> Log in with OpenRouter
      </Button>

      <form
        onSubmit={(e) => {
          setKey(key);
          e.preventDefault();
        }}
        className="flex items-center space-x-2"
      >
        <Input placeholder="sk-or-xxxxxxxxxxxxxx" value={key} onChange={(e) => setKeyLocal(e.target.value)} />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}

async function createSHA256CodeChallenge(input: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hash);
  const hashBase64 = Buffer.from(hashArray).toString("base64");
  return hashBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function OpenRouterLogo() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className="size-4"
      fill="currentColor"
      stroke="currentColor"
      aria-label="Logo"
    >
      <g clipPath="url(#clip0_205_3)">
        <path
          d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945"
          strokeWidth="90"
        ></path>
        <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z"></path>
        <path
          d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377"
          strokeWidth="90"
        ></path>
        <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z"></path>
      </g>
      <title className="hidden">OpenRouter</title>
      <defs>
        <clipPath id="clip0_205_3">
          <rect width="512" height="512" fill="white"></rect>
        </clipPath>
      </defs>
    </svg>
  );
}
