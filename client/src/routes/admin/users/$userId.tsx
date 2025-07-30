import { PageBack } from "@/components/settings/BackButtons";
import UserDetailsCard from "@/components/settings/UserDetailsCard";
import { trpc } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users/$userId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();

  const user = useQuery(trpc.admin.users.get.queryOptions(userId));

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />
      <h1 className="p-2 text-2xl font-bold">Editing user {user.data?.user.name ?? "Loading..."}</h1>

      <UserDetailsCard userId={userId} />
    </div>
  );
}
