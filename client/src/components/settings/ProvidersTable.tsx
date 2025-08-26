import type { RouterOutput } from "@/lib/trpc";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export type ProviderType = RouterOutput["settings"]["getProvider"]["type"];
type Provider = Omit<RouterOutput["settings"]["listProviders"][number], "modelsCount"> & {
  modelsCount: number | "All";
};

export type ProviderAction = (opts: { provider_id: string; action: "delete" | "edit" }) => void;

export const providerTypes: Record<ProviderType, { id: ProviderType; label: string; defaultBaseURL: string }> = {
  openai: { id: "openai", label: "OpenAI", defaultBaseURL: "https://api.openai.com/v1" },
  anthropic: { id: "anthropic", label: "Anthropic", defaultBaseURL: "https://api.anthropic.com/v1" },
  google: { id: "google", label: "Google", defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta" },
  mistral: { id: "mistral", label: "Mistral", defaultBaseURL: "https://api.mistral.ai/v1" },
  deepseek: { id: "deepseek", label: "DeepSeek", defaultBaseURL: "https://api.deepseek.com/v1" },
  // grok: { id: "grok", label: "Grok", defaultBaseURL: "https://api.x.ai/v1" },
  openrouter: { id: "openrouter", label: "OpenRouter", defaultBaseURL: "https://openrouter.ai/api/v1" },
  groq: { id: "groq", label: "Groq", defaultBaseURL: "https://api.groq.com/openai/v1" },
} as const;

export default function ProvidersTable({
  providers,
  action,
}: {
  providers: Provider[];
  showType?: boolean;
  action?: ProviderAction;
}) {
  const columns: ColumnDef<Provider>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => providerTypes[row.original.type]?.label,
    },
    {
      accessorKey: "baseUrl",
      header: "Base URL",
    },
    {
      accessorKey: "modelsCount",
      header: "Models",
      cell: ({ row }) => row.original.modelsCount + " Models",
    },
    {
      id: "actions",
    },
  ];

  const table = useReactTable({
    data: providers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="h-10 text-lg">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="font-bold">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
