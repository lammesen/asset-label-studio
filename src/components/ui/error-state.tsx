import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  fullPage?: boolean;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "We couldn't load the data. Please try again.", 
  onRetry, 
  className,
  fullPage = false 
}: ErrorStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center p-8", className)}>
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RotateCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
