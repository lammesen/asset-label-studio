import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-8 text-center animate-in fade-in-50",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4 ring-8 ring-muted/20">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mb-8 mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
