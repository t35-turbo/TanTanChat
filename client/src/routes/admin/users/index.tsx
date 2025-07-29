import UsersTable from "@/components/settings/admin/UsersTable";
import { PageBack } from "@/components/settings/BackButtons";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/users/")({
  head: () => ({
    meta: [{ title: `Users | TanTan` }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="relative h-screen w-full">
      <div className="flex h-screen w-full flex-col gap-2 overflow-scroll p-4">
        <PageBack />

        <h1 className="p-2 text-2xl font-bold">User Management</h1>

        <UsersTable />
      </div>
    </div>
  );
}
