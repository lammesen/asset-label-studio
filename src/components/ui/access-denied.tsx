import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function AccessDenied({
  title = "Access Restricted",
  message = "You don't have permission to view this content. Please contact your administrator.",
  action
}: AccessDeniedProps) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="rounded-full bg-destructive/10 p-4 mb-4 ring-8 ring-destructive/5">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {message}
      </p>
      {action ? action : (
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      )}
    </div>
  );
}
