import { createFileRoute } from "@tanstack/react-router";
import { PageBack } from "@/components/settings/BackButtons";
import { LocalKey } from "@/components/settings/LocalKey";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/settings/keys")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-2 p-4 w-full">
      <PageBack />

      <h1 className="text-2xl font-bold p-2">Key Management</h1>
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
