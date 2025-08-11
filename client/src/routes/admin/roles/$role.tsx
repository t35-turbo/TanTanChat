import UsersTable from "@/components/settings/admin/UsersTable";
import { PageBack } from "@/components/settings/BackButtons";
import { default as RawSettingsToggle } from "@/components/settings/SettingsToggle";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSidebar } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AppRouter, queryClient, type RouterOutput, trpc } from "@/lib/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { inferProcedureOutput } from "@trpc/server";
import { ChevronLeft } from "lucide-react";
import { useRef, useState } from "react";

export const Route = createFileRoute("/admin/roles/$role")({
  head: () => {
    return { meta: [{ title: `Edit Role | TanTan` }] };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { role: roleId } = Route.useParams();

  const role = useQuery(trpc.admin.roles.get.queryOptions(roleId));

  const sidebar = useSidebar();

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageBack />

      {!sidebar.isMobile && (
        <Button variant={"ghost"} className="text-md mr-auto flex items-center" asChild>
          <Link to="/admin/roles">
            <ChevronLeft className="size-5" />
            Back to Roles
          </Link>
        </Button>
      )}

      <h1 className="p-2 text-2xl font-bold">Edit Role - {role.data?.name ?? "Loading..."}</h1>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="h-auto w-fit gap-2 rounded-none border-b bg-transparent p-0">
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
          <UserSearch roleId={roleId} />
          <UsersTable roleId={roleId} />
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

          <RawSettingsToggle
            header="Allow Local API Keys"
            description="Allow users to use OpenRouter keys stored locally on their device"
            checked={role.allow_local_keys}
            onCheckedChange={(checked) => {
              updateRoleMutation.mutate({ ...role, allow_local_keys: checked });
            }}
          />

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

function UserSearch({ roleId }: { roleId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RouterOutput["admin"]["users"]["search"][number] | null>(null);
  const roleQuery = useQuery(trpc.admin.roles.get.queryOptions(roleId));

  const searchQuery = useQuery({
    ...trpc.admin.users.search.queryOptions(search),
    placeholderData: (previousData) => previousData,
  });

  const setMemberRoleMutation = useMutation(
    trpc.admin.roles.setMemberRole.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.roles.getMembers.queryKey(roleId) });
        setSelectedUser(null);
        setSearch("");
        setIsFocused(false);
      },
    }),
  );

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div className="relative h-9 overflow-visible rounded mb-4">
        <div className="bg-background group absolute z-10 w-full">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search users to add..."
            className={`${isFocused && "rounded-b-none border-b-0"} focus-visible:ring-0`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <div className={`border-ring space-y-1 rounded-b-md border-x border-b p-1 ${!isFocused && "hidden"}`}>
            {searchQuery.isSuccess &&
              roleQuery.isSuccess &&
              (searchQuery.data.length > 0 ? (
                searchQuery.data.map((user) => (
                  <AlertDialogTrigger
                    key={user.id}
                    asChild
                    onMouseDown={() => {
                      setSelectedUser(user);
                      setDialogOpen(true);
                    }}
                  >
                    <div
                      className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded px-1"
                      onMouseDown={() => console.log("test")}
                    >
                      <div className="text-lg">{user.name}</div>
                      <div className="text-muted-foreground text-sm">{user.email}</div>
                      <div className="ml-auto">{user.role}</div>
                    </div>
                  </AlertDialogTrigger>
                ))
              ) : (
                <p>No results found.</p>
              ))}
            {(searchQuery.isPending || roleQuery.isPending) && <p>Searching...</p>}
          </div>
        </div>
      </div>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add User to Role</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedUser?.role === roleId ? (
              <>
                <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) already has the role{" "}
                <strong>{roleQuery.data?.name}</strong>.
              </>
            ) : (
              <>
                Are you sure you want to set <strong>{selectedUser?.name}</strong>'s ({selectedUser?.email}) role to{" "}
                <strong>{roleQuery.data?.name}</strong>?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {selectedUser?.role === roleId ? (
            <AlertDialogCancel onClick={() => setTimeout(() => inputRef.current?.focus())}>Close</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel onClick={() => setTimeout(() => inputRef.current?.focus())}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedUser) {
                    setMemberRoleMutation.mutate({
                      roleId,
                      userId: selectedUser.id,
                    });
                  }
                }}
                disabled={setMemberRoleMutation.isPending}
              >
                {setMemberRoleMutation.isPending ? "Adding..." : "Confirm"}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
