import { Input } from "@/components/ui/input";
import { trpc, type RouterOutput } from "@/lib/trpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export default function RoleSearch({
  role,
  onRoleChange,
}: {
  role?: RouterOutput["admin"]["roles"]["search"][number];
  onRoleChange?: (roleId: RouterOutput["admin"]["roles"]["search"][number]) => void;
}) {
  const [search, setSearch] = useState(role?.name ?? "");
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useQuery(trpc.admin.roles.search.queryOptions(search, { placeholderData: (pastQuery) => pastQuery }));

  function selectRole(role: RouterOutput["admin"]["roles"]["search"][number]) {
    inputRef.current?.blur();
    setSearch(role.name);
    onRoleChange?.(role);
  }

  useEffect(() => {
    if (role === undefined) {
      setSearch("");
    }
  }, [role]);

  return (
    <div className="relative" data-role-search>
      <Input
        placeholder="Search for a role..."
        className={`focus-visible:ring-0 ${focus && "rounded-b-none border-b-0"}`}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        ref={inputRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            inputRef.current?.blur();
          } else if (e.key === "Enter" && query.data && query.data.length > 0) {
            setSearch(query.data[0].name);
            inputRef.current?.blur();
          }
        }}
      />
      <div
        className={`bg-background border-ring absolute top-full w-full rounded-b-md border border-t-0 ${!focus && "hidden"} z-10`}
      >
        {query.data?.map((role) => (
          <button
            key={role.id}
            onMouseDown={() => selectRole(role)}
            className="hover:bg-muted text-md w-full cursor-pointer p-1 text-left last:rounded-b-md"
          >
            {role.name}
          </button>
        ))}
      </div>
    </div>
  );
}
