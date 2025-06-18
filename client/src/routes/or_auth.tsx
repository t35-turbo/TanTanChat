import { useKeyInput } from "@/hooks/use-key-input";
import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import React from "react";
import { toast } from "sonner";
import ky from "ky";
import { useORKey } from "@/hooks/use-or-key";

export const Route = createFileRoute("/or_auth")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const navigate = useNavigate();
  const open = useKeyInput((state) => state.open);
  const setKey = useORKey((state) => state.setKey);
  const hasExchanged = React.useRef(false); // jank

  React.useEffect(() => {
    if (hasExchanged.current) return;

    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const pkce_sec = localStorage.getItem("pkce_sec");

    if (!code || !pkce_sec) {
      toast.error("Error while Logging In: No Code Provided");
      open();
      navigate({ to: "/" });
      return;
    }

    hasExchanged.current = true;

    async function pkce_exchange() {
      try {
        const response = (await ky
          .post("https://openrouter.ai/api/v1/auth/keys", {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: code,
              code_verifier: pkce_sec,
              code_challenge_method: "S256",
            }),
          })
          .json()) as { key?: string };

        if ("key" in response && typeof response.key === "string") {
          setKey(response.key);
          navigate({ to: "/chat" });
        }
      } catch (error) {
        toast.error("Error during PKCE exchange");
        open();
        navigate({ to: "/chat" });
        throw error;
      }
    }

    pkce_exchange();
  }, []);
  return <div>Loading...</div>;
}
