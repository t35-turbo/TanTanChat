import { PageBack } from "@/components/settings/BackButtons";
import { default as RawSettingsToggle } from "@/components/settings/SettingsToggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AppRouter, queryClient, type RouterOutput, trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { inferProcedureOutput } from "@trpc/server";
import { useState } from "react";

export const Route = createFileRoute("/admin/roles/$role")({
  component: RouteComponent,
});

function RouteComponent() {
  const { role: roleId } = Route.useParams();

  const role = useQuery(trpc.admin.roles.get.queryOptions(roleId));

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />

      <h1 className="p-2 text-2xl font-bold">Edit Role - {role.data?.name ?? "Loading..."}</h1>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="h-auto w-fit gap-2 border-b bg-transparent p-0">
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground hover:bg-accent hover:text-accent-foreground rounded-b-none data-[state=inactive]:bg-transparent"
          >
            Settings
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-foreground hover:bg-accent hover:text-accent-foreground rounded-b-none data-[state=inactive]:bg-transparent"
          >
            Members
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <RoleSettings roleId={roleId} />
        </TabsContent>
        <TabsContent value="members">
          <RoleMembers roleId={roleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Role = RouterOutput["admin"]["roles"]["get"];

function RoleSettings({ roleId }: { roleId: string }) {
  const roleQuery = useQuery(trpc.admin.roles.get.queryOptions(roleId));

  const updateRoleMutation = useMutation(
    trpc.admin.roles.update.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.roles.get.queryKey(roleId) });
        queryClient.invalidateQueries({ queryKey: trpc.admin.roles.list.queryKey() });
      },
    }),
  );

  const role: Role =
    updateRoleMutation.variables ??
    roleQuery.data ??
    (roleQuery.isPending
      ? {
          id: roleId,
          name: "Loading...",
          color: "#FFFFFF",
          allow_local_keys: false,
          allow_byok: false,
          allow_custom_providers: false,
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date(),
        }
      : {
          id: roleId,
          name: "Error loading data",
          color: "#FFFFFF",
          allow_local_keys: false,
          allow_byok: false,
          allow_custom_providers: false,
          is_admin: false,
          created_at: new Date(),
          updated_at: new Date(),
        });

  if (roleQuery.isLoading) {
    return <div>Loading role settings...</div>;
  }

  if (roleQuery.error || !roleQuery.data) {
    return <div>Error loading role settings.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Role Configuration</h1>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role-name">Role Name</Label>
          <Input
            id="role-name"
            value={role.name}
            onChange={(e) => updateRoleMutation.mutate({ ...role, name: e.target.value })}
            placeholder="Enter role name"
          />
        </div>

        {/* TODO: Role Color */}
        {/* <div className="space-y-2">
          <Label>Role Color</Label>
          <p className="text-muted-foreground text-sm">TODO: Implement role color picker</p>
        </div> */}

        {/* Permission Toggles */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Permissions</h3>

          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium">Allow Local API Keys</p>
              <p className="text-muted-foreground text-sm">Allow users in this role to use local API keys</p>
            </div>
            <div className="flex items-center self-start">
              <RawSettingsToggle
                header=""
                description=""
                checked={role.allow_local_keys}
                onCheckedChange={(checked) => {
                  updateRoleMutation.mutate({ ...role, allow_local_keys: checked });
                }}
              />
            </div>
          </div>

          <RawSettingsToggle
            header="Allow Bring Your Own Key"
            description="Allow users in this role to use Local API Keys"
            checked={role.allow_byok}
            onCheckedChange={(checked) => {
              updateRoleMutation.mutate({ ...role, allow_byok: checked });
            }}
          />

          <RawSettingsToggle
            header="Allow Custom Providers"
            description="Allow users to configure custom AI provider endpoints"
            checked={role.allow_custom_providers}
            onCheckedChange={(checked) => {
              updateRoleMutation.mutate({ ...role, allow_custom_providers: checked });
            }}
          />
        </div>
      </div>
    </div>
  );
}

type RoleMember = inferProcedureOutput<AppRouter["admin"]["roles"]["getMembers"]>[number];

const columns: ColumnDef<RoleMember>[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => {
      const name = row.getValue("name") as string;
      const email = row.original.email;
      return (
        <div>
          <div className="font-medium">{name || "No name"}</div>
          <div className="text-muted-foreground text-sm">{email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
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

function UserSearch() {
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchQuery = useQuery({
    ...trpc.admin.users.search.queryOptions(search),
    placeholderData: (previousData) => previousData,
  });

  return (
    <div className="relative h-9 overflow-visible rounded">
      <div className="bg-background group absolute z-10 w-full">
        <Input
          type="text"
          placeholder="Search users to add..."
          className={`${isFocused && "rounded-b-none border-b-0"} focus-visible:ring-0`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isFocused && (
          <div className="border-ring rounded-b-md border-x border-b p-1 space-y-1">
            {searchQuery.isSuccess &&
              (searchQuery.data.length > 0 ? (
                searchQuery.data.map((user) => (
                  <div key={user.id} className="flex cursor-pointer items-center space-x-2 px-1">
                    <div className="text-lg">{user.name}</div>
                    <div className="text-muted-foreground text-sm">{user.email}</div>
                    <div className="ml-auto">
                      {user.role}
                    </div>
                  </div>
                ))
              ) : (
                <p>No results found.</p>
              ))}
            {searchQuery.isPending && <p>Searching...</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleMembers({ roleId }: { roleId: string }) {
  const members = useQuery(trpc.admin.roles.getMembers.queryOptions(roleId));

  const table = useReactTable({
    data: members.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (members.isLoading) {
    return <div>Loading members...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Role Members ({members.data?.length ?? 0})</h1>
      <div className="mt-4">
        <div className="space-y-4">
          {/* Add Member Section */}
          <UserSearch />

          {/* Members Table */}
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
