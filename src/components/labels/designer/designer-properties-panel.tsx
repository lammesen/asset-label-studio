import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDesigner } from "./designer-context";
import { FIELD_TYPE_LABELS, ELEMENT_TYPE_LABELS, ASSET_FIELD_OPTIONS } from "./types";

export function DesignerPropertiesPanel() {
  const {
    spec,
    getSelectedField,
    getSelectedElement,
    updateField,
    updateElement,
    deleteSelected,
  } = useDesigner();

  const selectedField = getSelectedField();
  const selectedElement = getSelectedElement();
  const { unit } = spec.dimensions;

  if (!selectedField && !selectedElement) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {selectedField
              ? FIELD_TYPE_LABELS[selectedField.type]
              : selectedElement
              ? ELEMENT_TYPE_LABELS[selectedElement.type]
              : "Properties"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteSelected}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label="Delete selected item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedField && (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Data Source</Label>
              <Select
                value={selectedField.source}
                onValueChange={(value) => updateField(selectedField.id, { source: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_FIELD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">X ({unit})</Label>
                <Input
                  type="number"
                  value={selectedField.position.x.toFixed(1)}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      position: { ...selectedField.position, x: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y ({unit})</Label>
                <Input
                  type="number"
                  value={selectedField.position.y.toFixed(1)}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      position: { ...selectedField.position, y: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Width ({unit})</Label>
                <Input
                  type="number"
                  value={selectedField.size.width.toFixed(1)}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      size: { ...selectedField.size, width: parseFloat(e.target.value) || 1 },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height ({unit})</Label>
                <Input
                  type="number"
                  value={selectedField.size.height.toFixed(1)}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      size: { ...selectedField.size, height: parseFloat(e.target.value) || 1 },
                    })
                  }
                  className="h-8"
                />
              </div>
            </div>
          </>
        )}

        {selectedElement && (
          <>
            {selectedElement.type === "text" && (
              <div className="space-y-2">
                <Label className="text-xs">Text Content</Label>
                <Input
                  value={selectedElement.content ?? ""}
                  onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                />
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">X ({unit})</Label>
                <Input
                  type="number"
                  value={selectedElement.position.x.toFixed(1)}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      position: { ...selectedElement.position, x: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y ({unit})</Label>
                <Input
                  type="number"
                  value={selectedElement.position.y.toFixed(1)}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      position: { ...selectedElement.position, y: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Width ({unit})</Label>
                <Input
                  type="number"
                  value={selectedElement.size.width.toFixed(1)}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      size: { ...selectedElement.size, width: parseFloat(e.target.value) || 1 },
                    })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height ({unit})</Label>
                <Input
                  type="number"
                  value={selectedElement.size.height.toFixed(1)}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      size: { ...selectedElement.size, height: parseFloat(e.target.value) || 1 },
                    })
                  }
                  className="h-8"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DesignerSettingsPanel() {
  const { spec, updateSpec } = useDesigner();
  const { unit } = spec.dimensions;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Label Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Name</Label>
          <Input
            value={spec.name}
            onChange={(e) => updateSpec({ ...spec, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Width ({unit})</Label>
            <Input
              type="number"
              value={spec.dimensions.width}
              onChange={(e) =>
                updateSpec({
                  ...spec,
                  dimensions: { ...spec.dimensions, width: parseFloat(e.target.value) || 50 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height ({unit})</Label>
            <Input
              type="number"
              value={spec.dimensions.height}
              onChange={(e) =>
                updateSpec({
                  ...spec,
                  dimensions: { ...spec.dimensions, height: parseFloat(e.target.value) || 25 },
                })
              }
              className="h-8"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">DPI</Label>
          <Input
            type="number"
            value={spec.dpi}
            onChange={(e) =>
              updateSpec({ ...spec, dpi: parseInt(e.target.value) || 300 })
            }
            className="h-8"
          />
        </div>
      </CardContent>
    </Card>
  );
}
