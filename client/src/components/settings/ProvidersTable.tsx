import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

type Provider = {
  name: string;
  id: string;
  type: string;
  baseUrl: string;
  modelsCount: number;
};

export type ProviderAction = (opts: {
  provider_id: string;
  action: "delete" | "edit"
}) => void

export default function ProvidersTable({
  providers,
  showType = false,
  action
}: {
  providers: Provider[];
  showType?: boolean;
  action?: ProviderAction
}) {
  const columns: ColumnDef<Provider>[] = useMemo(
    (): ColumnDef<Provider>[] => [
      {
        accessorKey: "name",
        header: "Name",
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
      },
      {
        accessorKey: "base_url",
        header: "Base URL",
      },
      {
        accessorKey: "models_count",
        header: "Models",
        cell: ({ row }) => row.original.modelsCount + " Models",
      },
      {
        id: "actions",
      },
    ],
    [showType],
  );

  const table = useReactTable({
    data: providers,
    state: {
      columnVisibility: {
        type: showType,
      },
    },
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
