import { PageBack } from "@/components/settings/BackButtons";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users/$userId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />
      <h1 className="p-2 text-2xl font-bold">Edit Role - {role.data?.name ?? "Loading..."}</h1>
    </div>
  );
}
