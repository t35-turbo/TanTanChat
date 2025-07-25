import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  text?: string;
  variant?: "pulse" | "spinner";
  className?: string;
}

export function LoadingScreen({ text = "Loading...", variant = "pulse", className }: LoadingScreenProps) {
  return (
    <div className={cn("flex h-screen w-full grow flex-col items-center justify-center p-2", className)}>
      {variant === "pulse" ? (
        <div className="bg-border size-10 rounded-full motion-safe:animate-pulse" />
      ) : (
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      )}
      {text && <p className="text-muted-foreground mt-4 text-center">{text}</p>}
    </div>
  );
}

export function EmptyLoadingScreen() {
  return <LoadingScreen variant="pulse" text="" />;
}
