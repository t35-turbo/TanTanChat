import { PageBack } from "@/components/settings/BackButtons";
import { default as RawSettingsToggle } from "@/components/settings/SettingsToggle";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { queryClient, trpc, type AppRouter } from "@/lib/trpc";
import type { inferProcedureInput, inferProcedureOutput } from "@trpc/server";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-2 p-4 w-full">
      <PageBack />

      <h1 className="text-2xl font-bold p-2">Admin Settings</h1>

      <UserManagement />
    </div>
  );
}

function UserManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsToggle
          header="Allow New Signups"
          description="Allow new users to register accounts"
          attr="allow_new_signups"
        />
      </CardContent>
    </Card>
  );
}

function SettingsToggle({
  header,
  description,
  attr,
}: {
  header: string;
  description: string;
  attr: {
    [K in keyof NonNullable<inferProcedureOutput<AppRouter["admin"]["settings"]["get"]>>]: NonNullable<
      inferProcedureOutput<AppRouter["admin"]["settings"]["get"]>
    >[K] extends boolean
      ? K
      : never;
  }[keyof NonNullable<inferProcedureOutput<AppRouter["admin"]["settings"]["get"]>>];
}) {
  const setting = useQuery(trpc.admin.settings.get.queryOptions([attr]));
  const mutation = useMutation(
    trpc.admin.settings.set.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: trpc.admin.settings.get.queryKey() });
      },
    }),
  );

  return (
    <RawSettingsToggle
      header={header}
      description={description}
      checked={mutation.variables?.[attr] ?? setting.data?.[attr]}
      onCheckedChange={(cur) => {
        mutation.mutate({ [attr]: cur });
      }}
    />
  );
}
