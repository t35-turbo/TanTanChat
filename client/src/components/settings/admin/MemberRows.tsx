import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/lib/trpc";

type RoleMember = inferProcedureOutput<AppRouter["admin"]["roles"]["getMembers"]>[number];

interface MemberRowProps {
  member: RoleMember;
}

export function MemberRow({ member }: MemberRowProps) {
  return (
    <div>
      <div className="font-medium">{member.name || "No name"}</div>
      <div className="text-muted-foreground text-sm">{member.email}</div>
    </div>
  );
}

export function MemberDateCell({ member }: MemberRowProps) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(member.createdAt);
}