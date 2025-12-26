import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For actions like buttons
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageShell({ children, className, fullWidth = false }: PageShellProps) {
  return (
    <div className={cn("space-y-6 pb-12", !fullWidth && "max-w-6xl mx-auto", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, children, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4" />}
                <span className={cn(i === breadcrumbs.length - 1 && "text-foreground font-medium")}>
                  {crumb.label}
                </span>
              </div>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
