import { useState, useRef, useCallback, useEffect } from "react";

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
import type {
  LabelSpec,
  LabelField,
  LabelElement,
  LabelFieldType,
  LabelElementType,
} from "@/types/label-spec";
import {
  DEFAULT_TEXT_STYLE,
  DEFAULT_BARCODE_STYLE,
  DEFAULT_QRCODE_STYLE,
} from "@/types/label-spec";

interface LabelDesignerProps {
  spec: LabelSpec;
  onSpecChange: (spec: LabelSpec) => void;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

type SelectedItem = 
  | { type: "field"; id: string }
  | { type: "element"; id: string }
  | null;

const SCALE = 3;

const FIELD_TYPE_LABELS: Record<LabelFieldType, string> = {
  text: "Text Field",
  qrcode: "QR Code",
  barcode: "Barcode",
  image: "Image",
  date: "Date",
};

const ELEMENT_TYPE_LABELS: Record<LabelElementType, string> = {
  text: "Static Text",
  line: "Line",
  rect: "Rectangle",
  image: "Static Image",
  logo: "Logo",
};

const ASSET_FIELD_OPTIONS = [
  { value: "assetTag", label: "Asset Tag" },
  { value: "serialNumber", label: "Serial Number" },
  { value: "manufacturer", label: "Manufacturer" },
  { value: "model", label: "Model" },
  { value: "location", label: "Location" },
  { value: "department", label: "Department" },
  { value: "assignedTo", label: "Assigned To" },
  { value: "category", label: "Category" },
  { value: "type", label: "Type" },
  { value: "status", label: "Status" },
];

export function LabelDesigner({
  spec,
  onSpecChange,
  onSave,
  onCancel,
  isSaving,
}: LabelDesignerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStateRef = useRef<{
    offset: { x: number; y: number };
    currentPos: { x: number; y: number };
    rafId: number | null;
  }>({ offset: { x: 0, y: 0 }, currentPos: { x: 0, y: 0 }, rafId: null });

  const { width, height, unit } = spec.dimensions;
  const canvasWidth = width * SCALE;
  const canvasHeight = height * SCALE;

  const getSelectedField = useCallback((): LabelField | undefined => {
    if (selectedItem?.type === "field") {
      return spec.fields.find((f) => f.id === selectedItem.id);
    }
    return undefined;
  }, [selectedItem, spec.fields]);

  const getSelectedElement = useCallback((): LabelElement | undefined => {
    if (selectedItem?.type === "element") {
      return spec.elements.find((e) => e.id === selectedItem.id);
    }
    return undefined;
  }, [selectedItem, spec.elements]);

  function updateField(id: string, updates: Partial<LabelField>) {
    const newFields = spec.fields.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    onSpecChange({ ...spec, fields: newFields });
  }

  function updateElement(id: string, updates: Partial<LabelElement>) {
    const newElements = spec.elements.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    onSpecChange({ ...spec, elements: newElements });
  }

  function addField(type: LabelFieldType) {
    const newField: LabelField = {
      id: crypto.randomUUID(),
      type,
      source: "assetTag",
      position: { x: 5, y: 5 },
      size: { width: 30, height: type === "qrcode" ? 15 : 8 },
      style: type === "text" || type === "date"
        ? { ...DEFAULT_TEXT_STYLE }
        : type === "barcode"
        ? { ...DEFAULT_BARCODE_STYLE }
        : type === "qrcode"
        ? { ...DEFAULT_QRCODE_STYLE }
        : { objectFit: "contain" as const, opacity: 1 },
    };
    onSpecChange({ ...spec, fields: [...spec.fields, newField] });
    setSelectedItem({ type: "field", id: newField.id });
  }

  function addElement(type: LabelElementType) {
    const newElement: LabelElement = {
      id: crypto.randomUUID(),
      type,
      position: { x: 5, y: 5 },
      size: { width: type === "line" ? 30 : 20, height: type === "line" ? 0.5 : 10 },
      content: type === "text" ? "Label Text" : undefined,
      style: {
        fontFamily: "Arial",
        fontSize: 10,
        fontWeight: "normal",
        color: "#000000",
        fill: type === "rect" ? "#f3f4f6" : undefined,
        stroke: type === "line" || type === "rect" ? "#000000" : undefined,
        strokeWidth: type === "line" ? 0.5 : 1,
      },
    };
    onSpecChange({ ...spec, elements: [...spec.elements, newElement] });
    setSelectedItem({ type: "element", id: newElement.id });
  }

  function deleteSelected() {
    if (!selectedItem) return;

    if (selectedItem.type === "field") {
      onSpecChange({
        ...spec,
        fields: spec.fields.filter((f) => f.id !== selectedItem.id),
      });
    } else {
      onSpecChange({
        ...spec,
        elements: spec.elements.filter((e) => e.id !== selectedItem.id),
      });
    }
    setSelectedItem(null);
  }

  function handlePointerDown(
    e: React.PointerEvent,
    item: { type: "field" | "element"; id: string }
  ) {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as SVGGElement;
    target.setPointerCapture(e.pointerId);
    
    setSelectedItem(item);
    setIsDragging(true);

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / SCALE;
    const y = (e.clientY - rect.top) / SCALE;

    const itemData =
      item.type === "field"
        ? spec.fields.find((f) => f.id === item.id)
        : spec.elements.find((el) => el.id === item.id);

    if (itemData) {
      dragStateRef.current.offset = {
        x: x - itemData.position.x,
        y: y - itemData.position.y,
      };
      dragStateRef.current.currentPos = { ...itemData.position };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !selectedItem) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const { offset } = dragStateRef.current;
    const x = Math.max(0, Math.min(width, (e.clientX - rect.left) / SCALE - offset.x));
    const y = Math.max(0, Math.min(height, (e.clientY - rect.top) / SCALE - offset.y));

    dragStateRef.current.currentPos = { x, y };

    if (dragStateRef.current.rafId === null) {
      dragStateRef.current.rafId = requestAnimationFrame(() => {
        dragStateRef.current.rafId = null;
        const pos = dragStateRef.current.currentPos;
        if (selectedItem.type === "field") {
          updateField(selectedItem.id, { position: pos });
        } else {
          updateElement(selectedItem.id, { position: pos });
        }
      });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragStateRef.current.rafId !== null) {
      cancelAnimationFrame(dragStateRef.current.rafId);
      dragStateRef.current.rafId = null;
    }

    if (isDragging && selectedItem) {
      const pos = dragStateRef.current.currentPos;
      if (selectedItem.type === "field") {
        updateField(selectedItem.id, { position: pos });
      } else {
        updateElement(selectedItem.id, { position: pos });
      }
    }

    const target = e.currentTarget as SVGGElement;
    target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (!isDragging && e.target === e.currentTarget) {
      setSelectedItem(null);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedItem && document.activeElement?.tagName !== "INPUT") {
          deleteSelected();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem]);

  const selectedField = getSelectedField();
  const selectedElement = getSelectedElement();

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">{spec.name}</h3>
            <span className="text-sm text-gray-500">
              {width} × {height} {unit}
            </span>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="flex-1 bg-gray-100 rounded-lg p-6 overflow-auto flex items-center justify-center">
          <div
            className="bg-white shadow-lg"
            style={{ width: canvasWidth, height: canvasHeight }}
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              viewBox={`0 0 ${width} ${height}`}
              onClick={handleCanvasClick}
              className="cursor-crosshair touch-none"
              style={{ touchAction: "none" }}
            >
              <rect
                x={spec.margins.left}
                y={spec.margins.top}
                width={width - spec.margins.left - spec.margins.right}
                height={height - spec.margins.top - spec.margins.bottom}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={0.2}
                strokeDasharray="1,1"
              />

              {spec.elements.map((element) => (
                <g
                  key={element.id}
                  transform={`translate(${element.position.x}, ${element.position.y})`}
                  onPointerDown={(e) => handlePointerDown(e, { type: "element", id: element.id })}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="cursor-move touch-none"
                >
                  {element.type === "rect" && (
                    <rect
                      width={element.size.width}
                      height={element.size.height}
                      fill={element.style.fill ?? "transparent"}
                      stroke={element.style.stroke ?? "none"}
                      strokeWidth={element.style.strokeWidth ?? 1}
                      rx={element.style.borderRadius ?? 0}
                    />
                  )}
                  {element.type === "line" && (
                    <line
                      x1={0}
                      y1={0}
                      x2={element.size.width}
                      y2={0}
                      stroke={element.style.stroke ?? "#000"}
                      strokeWidth={element.style.strokeWidth ?? 0.5}
                    />
                  )}
                  {element.type === "text" && (
                    <text
                      fontSize={element.style.fontSize ?? 10}
                      fontFamily={element.style.fontFamily ?? "Arial"}
                      fontWeight={element.style.fontWeight ?? "normal"}
                      fill={element.style.color ?? "#000"}
                    >
                      {element.content}
                    </text>
                  )}
                  {selectedItem?.type === "element" && selectedItem.id === element.id && (
                    <rect
                      x={-1}
                      y={-1}
                      width={element.size.width + 2}
                      height={element.size.height + 2}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={0.3}
                      strokeDasharray="1,1"
                    />
                  )}
                </g>
              ))}

              {spec.fields.map((field) => (
                <g
                  key={field.id}
                  transform={`translate(${field.position.x}, ${field.position.y})`}
                  onPointerDown={(e) => handlePointerDown(e, { type: "field", id: field.id })}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="cursor-move touch-none"
                >
                  <rect
                    width={field.size.width}
                    height={field.size.height}
                    fill="#f0f9ff"
                    stroke="#0ea5e9"
                    strokeWidth={0.3}
                    rx={0.5}
                  />
                  <text
                    x={2}
                    y={field.size.height / 2 + 2}
                    fontSize={Math.min(field.size.height * 0.5, 6)}
                    fontFamily="Arial"
                    fill="#0369a1"
                  >
                    {`{${field.source}}`}
                  </text>
                  {selectedItem?.type === "field" && selectedItem.id === field.id && (
                    <rect
                      x={-1}
                      y={-1}
                      width={field.size.width + 2}
                      height={field.size.height + 2}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={0.5}
                    />
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>

      <div className="w-72 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addField("text")}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addField("qrcode")}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addField("barcode")}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Barcode
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addElement("text")}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                Label
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addElement("rect")}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                </svg>
                Box
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addElement("line")}
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
                </svg>
                Line
              </Button>
            </div>
          </CardContent>
        </Card>

        {(selectedField || selectedElement) && (
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  aria-label="Delete selected item"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Label Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Name</Label>
              <Input
                value={spec.name}
                onChange={(e) => onSpecChange({ ...spec, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Width ({unit})</Label>
                <Input
                  type="number"
                  value={spec.dimensions.width}
                  onChange={(e) =>
                    onSpecChange({
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
                    onSpecChange({
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
                  onSpecChange({ ...spec, dpi: parseInt(e.target.value) || 300 })
                }
                className="h-8"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
