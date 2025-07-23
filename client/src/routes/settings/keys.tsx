import { PageBack } from "@/components/settings/BackButtons";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/settings/keys")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-2 p-4 w-full">
      <PageBack />

      <h1 className="text-2xl font-bold p-2">Key Management</h1>
    </div>
  );
}
