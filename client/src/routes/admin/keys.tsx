import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/keys")({
  head: () => ({
    meta: [{ title: "Admin - API Keys | TanTan" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/admin/keys"!</div>;
}
