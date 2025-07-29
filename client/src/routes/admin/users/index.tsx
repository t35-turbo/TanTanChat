import RoleSearch from "@/components/settings/admin/RoleSearch";
import { PageBack } from "@/components/settings/BackButtons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSettings } from "@/hooks/use-admin-users";
import { queryClient, type RouterOutput, trpc } from "@/lib/trpc";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Table as TanstackTable,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, Trash2, User, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users/")({
  head: () => ({
    meta: [{ title: `Users | TanTan` }],
  }),
  component: RouteComponent,
});

type User = RouterOutput["admin"]["users"]["paginatedSearchList"]["items"][number];

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

const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select All"
        className="flex"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select Row"
        className="flex"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: `Users`,
    cell: ({ row }) => (
      <div>
        <p>{row.getValue("name")}</p>
        <p className="text-muted-foreground font-light">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(row.original.createdAt);
    },
  },
];

function UsersTable() {
  const pageLimit = useSettings((state) => state.pageLimit);
  const setPageLimit = useSettings((state) => state.setPageLimit);
  const [search, setSearch] = useState("");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const pagesCount = useQuery(trpc.admin.users.pagesCount.queryOptions({ query: search, limit: pageLimit }));
  const usersQuery = useInfiniteQuery(
    trpc.admin.users.paginatedSearchList.infiniteQueryOptions(
      { limit: pageLimit, query: search },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialCursor: undefined,
        placeholderData: (previousData) => previousData,
      },
    ),
  );

  // Get current page data
  const currentPageData = usersQuery.data?.pages[currentPageIndex]?.items ?? [];
  const loadedPages = usersQuery.data?.pages.length ?? 0;
  const hasNextPage = usersQuery.hasNextPage;
  const isLoadingNextPage = usersQuery.isFetchingNextPage;

  const table = useReactTable({
    data: currentPageData,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    enableRowSelection: true,
  });

  // Handle page navigation
  const goToNextPage = async () => {
    if (currentPageIndex < loadedPages - 1) {
      // Navigate to next already-loaded page
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (hasNextPage) {
      // Fetch next page and navigate to it
      await usersQuery.fetchNextPage();
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const canGoNext = currentPageIndex < loadedPages - 1 || hasNextPage;
  const canGoPrevious = currentPageIndex > 0;

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPageIndex(0);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageLimit(newPageSize);
    setCurrentPageIndex(0);
  };

  const pageSizeOptions = [10, 25, 50, 100];

  // Selection state

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="w-full max-w-sm">
            <Input placeholder="Search users..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  Showing {pageLimit} Users
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {pageSizeOptions.map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={pageLimit === size ? "bg-accent" : ""}
                  >
                    Showing {size} Users
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant={"ghost"} className="p-2" onClick={goToPreviousPage} disabled={!canGoPrevious}>
              <ChevronLeft />
            </Button>
            <p className="text-sm">
              Page {currentPageIndex + 1} of {pagesCount.data ?? 0}
            </p>
            <Button variant={"ghost"} className="p-2" onClick={goToNextPage} disabled={!canGoNext || isLoadingNextPage}>
              {isLoadingNextPage ? "..." : <ChevronRight />}
            </Button>
          </div>
        </div>

        <div className="rounded border">
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
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="group">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <UserActionBar table={table} />
    </>
  );
}

function UserActionBar({
  table,
}: {
  table: TanstackTable<RouterOutput["admin"]["users"]["paginatedSearchList"]["items"][number]>;
}) {
  const selectedRowModel = table.getSelectedRowModel();
  const selectedCount = selectedRowModel.rows.length;

  const userText = selectedCount === 1 ? "User" : "Users";

  const [roleDiaOpen, setRoleDiaOpen] = useState(false);
  const [role, setRole] = useState<RouterOutput["admin"]["roles"]["search"][number] | undefined>(undefined);

  const assignRole = useMutation(
    trpc.admin.roles.setMemberRole.mutationOptions({
      onSettled: async () => {
        setRole(undefined);
        await queryClient.invalidateQueries({ queryKey: trpc.admin.users.paginatedSearchList.infiniteQueryKey() });
        await queryClient.invalidateQueries({ queryKey: trpc.admin.users.pagesCount.queryKey() });
        table.toggleAllRowsSelected(false);
        setRoleDiaOpen(false);
      },
    }),
  );

  return (
    <div
      className={`absolute bottom-10 flex w-full transform justify-center transition-all duration-300 ease-in-out ${
        table.getSelectedRowModel().rows.length > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="bg-accent min-w-3/5 max-w-11/12 flex items-center rounded-md border px-4 py-2 shadow-lg">
        <span className="font-medium">
          {selectedCount} {userText} Selected
        </span>
        <AlertDialog open={roleDiaOpen} onOpenChange={setRoleDiaOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="ml-auto h-full">
              <Wrench />
              Set Role
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            onEscapeKeyDown={(e) => {
              if (document.activeElement?.closest("[data-role-search]")) {
                e.preventDefault();
              }
            }}
          >
            <AlertDialogTitle className="font-bold">Assigning Role to {selectedCount} Users</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <div className="mb-1">What role would you like to assign?</div>
              <RoleSearch role={role} onRoleChange={setRole} />
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!role}
                onClick={(e) => {
                  e.preventDefault();
                  if (role) {
                    assignRole.mutate({
                      userId: table.getSelectedRowModel().rows.map((row) => row.original.id),
                      roleId: role?.id,
                    });
                  } else {
                    toast.error("Please select a role.");
                  }
                }}
              >
                {(assignRole.isIdle || assignRole.isSuccess) && (role ? `Assign role "${role.name}"` : "Assign")}
                {assignRole.isPending && "Assigning..."}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="ml-2">
              <Trash2 />
              Delete {selectedCount} {userText}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader className="text-xl font-bold">
              Are you sure you want to delete {selectedCount} users?
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive">Yes, I want to delete {selectedCount} users.</Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
