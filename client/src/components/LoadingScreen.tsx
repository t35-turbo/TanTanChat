import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  text?: string;
  variant?: "pulse" | "spinner";
  className?: string;
}

export function LoadingScreen({ 
  text = "Loading...", 
  variant = "pulse",
  className 
}: LoadingScreenProps) {
  return (
    <div className={cn(
      "flex flex-col grow items-center w-full h-screen justify-center p-2",
      className
    )}>
      {variant === "pulse" ? (
        <div className="bg-border rounded-full size-10 motion-safe:animate-pulse" />
      ) : (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
      )}
      {text && (
        <p className="text-center mt-4 text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

// Specific loading screen variants for common use cases
export function LoginLoadingScreen() {
  return <LoadingScreen variant="pulse" text="" />;
}

export function EmptyLoadingScreen() {
  return <LoadingScreen variant="pulse" text="" />;
}

export function SessionLoadingScreen() {
  return <LoadingScreen variant="spinner" text="Loading..." />;
}