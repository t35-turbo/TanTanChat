import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/providers/$providerId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { providerId } = useParams({ from: "/settings/providers/$providerId" });
  return <div>Hello "/settings/providers/$providerId"!</div>;
}
