import { PageBack } from "@/components/settings/BackButtons";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type RouterOutput, trpc } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type HeaderGroup,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, ShieldUser } from "lucide-react";

export const Route = createFileRoute("/admin/roles/")({
  component: RouteComponent,
});

type Role = RouterOutput["admin"]["roles"]["list"][number];

function RouteComponent() {
  const roles = useQuery(trpc.admin.roles.list.queryOptions());

  console.log(roles.data);

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />

      <h1 className="p-2 text-2xl font-bold">Role Management</h1>

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
          <div className="flex items-center gap-1 font-semibold">
            <ShieldUser color={row.original.color ?? undefined} />
            {row.getValue("name")}
          </div>
        );
      },
    },
    {
      accessorKey: "user_count",
      header: "Users",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" title="Edit Role" asChild>
                  <Link to="/admin/roles/$role" params={{ role: row.original.id }}>
                    <Pencil className="stroke-foreground/30 group-hover:stroke-foreground" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Role</TooltipContent>
            </Tooltip>
            {/* TODO: role impersonation <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
            </DropdownMenu> */}
          </div>
        );
      },
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
  const navigate = useNavigate();

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      className="group cursor-pointer"
      role="link"
      onClick={() => navigate({ to: "/admin/roles/$role", params: { role: row.original.id } })}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  );
}
