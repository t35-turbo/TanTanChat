import { PageBack } from "@/components/settings/BackButtons";
import { LocalKey } from "@/components/settings/LocalKey";
import ProvidersTable from "@/components/settings/ProvidersTable";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/settings/providers")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />

      <h1 className="p-2 text-2xl font-bold">Key Management</h1>
      <KeysTable />

      <div className="flex">
        <Button className="ml-auto">
          <Plus />
          Add Provider
        </Button>
      </div>
      <ProvidersTable
        providers={[
          {
            name: "Local OpenRouter",
            id: "openrouter_local",
            type: "openai",
            base_url: "https://openrouter.ai/api/v1",
            models_count: 0,
          },
        ]}
      />
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
