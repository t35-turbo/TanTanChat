import { PageBack } from "@/components/settings/BackButtons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc, type RouterOutput } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type HeaderGroup,
  type Row,
} from "@tanstack/react-table";
import { ContactRound, ShieldUser, SquareUser } from "lucide-react";

export const Route = createFileRoute("/admin/roles")({
  component: RouteComponent,
});

type Role = RouterOutput["admin"]["roles"]["list"][number];

function RouteComponent() {
  const roles = useQuery(trpc.admin.roles.list.queryOptions());

  console.log(roles.data);

  return (
    <div className="flex flex-col gap-2 p-4 w-full">
      <PageBack />

      <h1 className="text-2xl font-bold p-2">Role Management</h1>

      <RolesTable />
    </div>
  );
}

function RolesTable() {
  const roles = useQuery(trpc.admin.roles.list.queryOptions());

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: `Roles - ${roles.data?.length ?? 0}`,
      cell: ({ row }) => {
        return (
          <div className="flex gap-1 items-center font-semibold">
            <ShieldUser color={row.getValue("color")} />
            {row.getValue("name")}
          </div>
        );
      },
    },
    {
      accessorKey: "user_count",
      header: "Users",
    },
  ];

  const table = useReactTable({
    data: roles.data ?? [],
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="text-lg">
          {table.getHeaderGroups().map((headerGroup) => (
            <HeaderRows headerGroup={headerGroup} key={headerGroup.id} />
          ))}
        </TableHeader>
        <TableBody className="text-lg">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => <DataRows row={row} key={row.id} />)
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function HeaderRows<TData>({ headerGroup }: { headerGroup: HeaderGroup<TData> }) {
  return (
    <TableRow>
      {headerGroup.headers.map((header) => (
        <TableHead key={header.id} className="font-bold">
          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
        </TableHead>
      ))}
    </TableRow>
  );
}

function DataRows({ row }: { row: Row<Role> }) {
  const cells = row.getVisibleCells();

  return (
    <TableRow data-state={row.getIsSelected() && "selected"}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  );
}
