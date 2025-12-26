import { useEffect } from "react";

import type { LabelSpec } from "@/types/label-spec";
import { DesignerProvider, useDesigner } from "./designer-context";
import { DesignerToolbar } from "./designer-toolbar";
import { DesignerCanvas } from "./designer-canvas";
import { DesignerElementsPanel } from "./designer-elements-panel";
import { DesignerPropertiesPanel, DesignerSettingsPanel } from "./designer-properties-panel";

interface LabelDesignerProps {
  spec: LabelSpec;
  onSpecChange: (spec: LabelSpec) => void;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

function DesignerKeyboardHandler() {
  const { selectedItem, deleteSelected, undo, redo } = useDesigner();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInputFocused = document.activeElement?.tagName === "INPUT";

      if ((e.key === "Delete" || e.key === "Backspace") && !isInputFocused) {
        if (selectedItem) {
          deleteSelected();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !isInputFocused) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "y" && !isInputFocused) {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, undo, redo, deleteSelected]);

  return null;
}

function DesignerLayout({
  onSave,
  onCancel,
  isSaving,
}: Pick<LabelDesignerProps, "onSave" | "onCancel" | "isSaving">) {
  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col">
        <DesignerToolbar onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
        <DesignerCanvas />
      </div>

      <div className="w-72 flex flex-col gap-4">
        <DesignerElementsPanel />
        <DesignerPropertiesPanel />
        <DesignerSettingsPanel />
      </div>

      <DesignerKeyboardHandler />
    </div>
  );
}

export function LabelDesigner({
  spec,
  onSpecChange,
  onSave,
  onCancel,
  isSaving,
}: LabelDesignerProps) {
  return (
    <DesignerProvider spec={spec} onSpecChange={onSpecChange}>
      <DesignerLayout onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </DesignerProvider>
  );
}

export { DesignerProvider, useDesigner } from "./designer-context";
export { DesignerToolbar } from "./designer-toolbar";
export { DesignerCanvas } from "./designer-canvas";
export { DesignerElementsPanel } from "./designer-elements-panel";
export { DesignerPropertiesPanel, DesignerSettingsPanel } from "./designer-properties-panel";
export * from "./types";
