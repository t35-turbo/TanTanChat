import { useKeyInput } from "@/hooks/use-key-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { useORKey } from "@/hooks/use-or-key";
import { useState } from "react";
import { Button } from "./ui/button";
import { Buffer } from 'buffer';

export default function KeyInputModal() {
  const isOpen = useKeyInput((state) => state.isOpen);
  const toggle = useKeyInput((state) => state.toggle);
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
    <Dialog open={isOpen} onOpenChange={toggle}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Input OpenRouter API Key</DialogTitle>
          <span>Your key is stored locally and is never saved on our server.</span>
        </DialogHeader>

        <Button onClick={or_pkce}>
          Automatically Log in with OpenRouter
        </Button>

        <form
          onSubmit={(e) => {
            setKey(key);
            e.preventDefault();
            toggle(false);
          }}
          className="flex space-x-2"
        >
          <Input
            placeholder="sk-or-xxxxxxxxxxxxxx"
            value={key}
            onChange={(e) => setKeyLocal(e.target.value)}
          />
          <Button type="submit">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}


async function createSHA256CodeChallenge(input: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hash);
  const hashBase64 = Buffer.from(hashArray).toString('base64');
  return hashBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}