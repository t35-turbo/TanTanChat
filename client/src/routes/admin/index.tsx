import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin - Dashboard | TanTan" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/settings/admin/"!</div>;
}
