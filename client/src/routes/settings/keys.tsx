import { PageBack } from "@/components/settings/BackButtons";
import { LocalKey } from "@/components/settings/LocalKey";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/keys")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />

      <h1 className="p-2 text-2xl font-bold">Key Management</h1>
      <KeysTable />
    </div>
  );
}

function KeysTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Base URL</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <LocalKey />
      </TableBody>
    </Table>
  );
}
