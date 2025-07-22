import { cn } from "@/lib/utils";

export default function Logo({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1 className={cn("text-2xl font-bold h-12 font-comic flex items-center", className)} {...props}>
      <span>Tan</span>
      <span className="inline-block rotate-180 self-end">T</span>
      <span>an</span>
    </h1>
  );
}
