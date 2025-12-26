import { cn } from "@/lib/utils";

function BaseSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

interface LoadingSkeletonProps {
  variant: "table" | "card-grid" | "form" | "page";
  count?: number; 
  className?: string;
}

export function LoadingSkeleton({ variant, count = 3, className }: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between mb-6">
          <BaseSkeleton className="h-8 w-64" />
          <BaseSkeleton className="h-8 w-32" />
        </div>
        <div className="rounded-md border border-border">
          <div className="h-12 border-b border-border px-4 bg-muted/50 flex items-center">
            <BaseSkeleton className="h-4 w-full max-w-[200px]" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <BaseSkeleton className="h-4 w-8" />
                <BaseSkeleton className="h-4 w-32" />
                <BaseSkeleton className="h-4 w-48" />
                <BaseSkeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "card-grid") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <BaseSkeleton className="h-10 w-10 rounded-full" />
              <BaseSkeleton className="h-4 w-8" />
            </div>
            <div className="space-y-2">
              <BaseSkeleton className="h-5 w-3/4" />
              <BaseSkeleton className="h-4 w-full" />
            </div>
            <BaseSkeleton className="h-9 w-full mt-4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("space-y-6 max-w-2xl", className)}>
        <div className="space-y-2">
          <BaseSkeleton className="h-5 w-32" />
          <BaseSkeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <BaseSkeleton className="h-5 w-24" />
          <BaseSkeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <BaseSkeleton className="h-5 w-24" />
            <BaseSkeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <BaseSkeleton className="h-5 w-24" />
            <BaseSkeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("space-y-8", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <BaseSkeleton className="h-8 w-64" />
            <BaseSkeleton className="h-4 w-96" />
          </div>
          <BaseSkeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
             <BaseSkeleton className="h-[200px] w-full rounded-xl" />
             <BaseSkeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <BaseSkeleton className="h-[150px] w-full rounded-xl" />
            <BaseSkeleton className="h-[150px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
