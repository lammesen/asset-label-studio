import { memo, useCallback } from "react";

import { LabelDesigner } from "@/components/labels/designer";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import type { LabelSpec } from "@/types/label-spec";

interface LabelDesignerBoundaryProps {
  spec: LabelSpec;
  onSpecChange: (spec: LabelSpec) => void;
  onSave: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

function LabelDesignerBoundaryInner({
  spec,
  onSpecChange,
  onSave,
  onCancel,
  isSaving = false,
}: LabelDesignerBoundaryProps) {
  const handleSpecChange = useCallback(
    (newSpec: LabelSpec) => {
      onSpecChange(newSpec);
    },
    [onSpecChange]
  );

  const handleSave = useCallback(async () => {
    await onSave();
  }, [onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <LabelDesigner
      spec={spec}
      onSpecChange={handleSpecChange}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
    />
  );
}

const MemoizedLabelDesigner = memo(LabelDesignerBoundaryInner, (prevProps, nextProps) => {
  return (
    prevProps.spec === nextProps.spec &&
    prevProps.isSaving === nextProps.isSaving &&
    prevProps.onSpecChange === nextProps.onSpecChange &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onCancel === nextProps.onCancel
  );
});

MemoizedLabelDesigner.displayName = "MemoizedLabelDesigner";

export function LabelDesignerBoundary(props: LabelDesignerBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="h-full flex items-center justify-center bg-muted/50 rounded-lg">
          <div className="text-center p-8">
            <p className="text-lg font-medium text-destructive mb-2">
              Designer Error
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              The label designer encountered an error. Please try again.
            </p>
            <Button
              variant="link"
              onClick={props.onCancel}
              className="text-sm"
            >
              Return to template list
            </Button>
          </div>
        </div>
      }
    >
      <MemoizedLabelDesigner {...props} />
    </ErrorBoundary>
  );
}
