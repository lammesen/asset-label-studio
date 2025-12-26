import { Redo2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDesigner } from "./designer-context";

interface DesignerToolbarProps {
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

export function DesignerToolbar({ onSave, onCancel, isSaving }: DesignerToolbarProps) {
  const { spec, canUndo, canRedo, undo, redo } = useDesigner();
  const { width, height, unit } = spec.dimensions;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">{spec.name}</h3>
        <span className="text-sm text-muted-foreground">
          {width} × {height} {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (⌘Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Separator orientation="vertical" className="h-6" />
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {onSave && (
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Template"}
          </Button>
        )}
      </div>
    </div>
  );
}
