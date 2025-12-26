import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
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
  LabelField,
  LabelElement,
  TextStyle,
  BarcodeStyle,
  QRCodeStyle,
  TextAlign,
  VerticalAlign,
  BarcodeFormat,
} from "@/types/label-spec";

interface FieldEditorProps {
  field: LabelField;
  onFieldChange: (updates: Partial<LabelField>) => void;
  unit: string;
}

interface ElementEditorProps {
  element: LabelElement;
  onElementChange: (updates: Partial<LabelElement>) => void;
  unit: string;
}

const FONT_FAMILIES = [
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Courier New", label: "Courier New" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
];

const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

const BARCODE_FORMATS: { value: BarcodeFormat; label: string }[] = [
  { value: "CODE128", label: "Code 128" },
  { value: "CODE39", label: "Code 39" },
  { value: "EAN13", label: "EAN-13" },
  { value: "EAN8", label: "EAN-8" },
  { value: "UPC", label: "UPC" },
  { value: "ITF14", label: "ITF-14" },
];

const QR_ERROR_LEVELS: { value: "L" | "M" | "Q" | "H"; label: string }[] = [
  { value: "L", label: "Low (7%)" },
  { value: "M", label: "Medium (15%)" },
  { value: "Q", label: "Quartile (25%)" },
  { value: "H", label: "High (30%)" },
];

function TextStyleEditor({
  style,
  onStyleChange,
}: {
  style: TextStyle;
  onStyleChange: (updates: Partial<TextStyle>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Font Family</Label>
        <Select
          value={style.fontFamily}
          onValueChange={(value) => onStyleChange({ fontFamily: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Font Size</Label>
          <Select
            value={String(style.fontSize)}
            onValueChange={(value) => onStyleChange({ fontSize: Number(value) })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}pt
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Weight</Label>
          <Select
            value={style.fontWeight}
            onValueChange={(value) => onStyleChange({ fontWeight: value as "normal" | "bold" })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Horizontal Align</Label>
          <Select
            value={style.textAlign}
            onValueChange={(value) => onStyleChange({ textAlign: value as TextAlign })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Vertical Align</Label>
          <Select
            value={style.verticalAlign}
            onValueChange={(value) => onStyleChange({ verticalAlign: value as VerticalAlign })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Color</Label>
        <ColorPicker
          value={style.color}
          onChange={(value) => onStyleChange({ color: value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Text Transform</Label>
        <Select
          value={style.textTransform ?? "none"}
          onValueChange={(value) =>
            onStyleChange({ textTransform: value as "none" | "uppercase" | "lowercase" | "capitalize" })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="uppercase">UPPERCASE</SelectItem>
            <SelectItem value="lowercase">lowercase</SelectItem>
            <SelectItem value="capitalize">Capitalize</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function BarcodeStyleEditor({
  style,
  onStyleChange,
}: {
  style: BarcodeStyle;
  onStyleChange: (updates: Partial<BarcodeStyle>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Barcode Format</Label>
        <Select
          value={style.format}
          onValueChange={(value) => onStyleChange({ format: value as BarcodeFormat })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BARCODE_FORMATS.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Bar Width</Label>
          <Input
            type="number"
            value={style.width}
            onChange={(e) => onStyleChange({ width: Number(e.target.value) || 1 })}
            className="h-8"
            min={1}
            max={4}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Bar Height</Label>
          <Input
            type="number"
            value={style.height}
            onChange={(e) => onStyleChange({ height: Number(e.target.value) || 10 })}
            className="h-8"
            min={5}
            max={50}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Line Color</Label>
        <ColorPicker
          value={style.lineColor}
          onChange={(value) => onStyleChange({ lineColor: value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Background</Label>
        <ColorPicker
          value={style.background}
          onChange={(value) => onStyleChange({ background: value })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="displayValue"
          checked={style.displayValue}
          onCheckedChange={(checked) => onStyleChange({ displayValue: checked === true })}
        />
        <Label htmlFor="displayValue" className="text-xs cursor-pointer">
          Display value below barcode
        </Label>
      </div>
    </div>
  );
}

function QRCodeStyleEditor({
  style,
  onStyleChange,
}: {
  style: QRCodeStyle;
  onStyleChange: (updates: Partial<QRCodeStyle>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Error Correction</Label>
        <Select
          value={style.errorCorrectionLevel}
          onValueChange={(value) =>
            onStyleChange({ errorCorrectionLevel: value as "L" | "M" | "Q" | "H" })
          }
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QR_ERROR_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Margin</Label>
        <Input
          type="number"
          value={style.margin}
          onChange={(e) => onStyleChange({ margin: Number(e.target.value) || 0 })}
          className="h-8"
          min={0}
          max={10}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dark Color</Label>
        <ColorPicker
          value={style.darkColor}
          onChange={(value) => onStyleChange({ darkColor: value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Light Color</Label>
        <ColorPicker
          value={style.lightColor}
          onChange={(value) => onStyleChange({ lightColor: value })}
        />
      </div>
    </div>
  );
}

export function FieldEditor({ field, onFieldChange, unit }: FieldEditorProps) {
  function handleStyleChange(updates: Partial<TextStyle | BarcodeStyle | QRCodeStyle>) {
    onFieldChange({ style: { ...field.style, ...updates } as typeof field.style });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Field Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">X ({unit})</Label>
            <Input
              type="number"
              value={field.position.x.toFixed(1)}
              onChange={(e) =>
                onFieldChange({
                  position: { ...field.position, x: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y ({unit})</Label>
            <Input
              type="number"
              value={field.position.y.toFixed(1)}
              onChange={(e) =>
                onFieldChange({
                  position: { ...field.position, y: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Width ({unit})</Label>
            <Input
              type="number"
              value={field.size.width.toFixed(1)}
              onChange={(e) =>
                onFieldChange({
                  size: { ...field.size, width: parseFloat(e.target.value) || 1 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height ({unit})</Label>
            <Input
              type="number"
              value={field.size.height.toFixed(1)}
              onChange={(e) =>
                onFieldChange({
                  size: { ...field.size, height: parseFloat(e.target.value) || 1 },
                })
              }
              className="h-8"
            />
          </div>
        </div>

        {field.rotation !== undefined && (
          <div className="space-y-1">
            <Label className="text-xs">Rotation (degrees)</Label>
            <Input
              type="number"
              value={field.rotation}
              onChange={(e) =>
                onFieldChange({ rotation: parseFloat(e.target.value) || 0 })
              }
              className="h-8"
              min={-180}
              max={180}
            />
          </div>
        )}

        <Separator />

        {(field.type === "text" || field.type === "date") && (
          <TextStyleEditor
            style={field.style as TextStyle}
            onStyleChange={handleStyleChange}
          />
        )}

        {field.type === "barcode" && (
          <BarcodeStyleEditor
            style={field.style as BarcodeStyle}
            onStyleChange={handleStyleChange}
          />
        )}

        {field.type === "qrcode" && (
          <QRCodeStyleEditor
            style={field.style as QRCodeStyle}
            onStyleChange={handleStyleChange}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ElementEditor({ element, onElementChange, unit }: ElementEditorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Element Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {element.type === "text" && (
          <div className="space-y-2">
            <Label className="text-xs">Text Content</Label>
            <Input
              value={element.content ?? ""}
              onChange={(e) => onElementChange({ content: e.target.value })}
            />
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">X ({unit})</Label>
            <Input
              type="number"
              value={element.position.x.toFixed(1)}
              onChange={(e) =>
                onElementChange({
                  position: { ...element.position, x: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y ({unit})</Label>
            <Input
              type="number"
              value={element.position.y.toFixed(1)}
              onChange={(e) =>
                onElementChange({
                  position: { ...element.position, y: parseFloat(e.target.value) || 0 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Width ({unit})</Label>
            <Input
              type="number"
              value={element.size.width.toFixed(1)}
              onChange={(e) =>
                onElementChange({
                  size: { ...element.size, width: parseFloat(e.target.value) || 1 },
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Height ({unit})</Label>
            <Input
              type="number"
              value={element.size.height.toFixed(1)}
              onChange={(e) =>
                onElementChange({
                  size: { ...element.size, height: parseFloat(e.target.value) || 1 },
                })
              }
              className="h-8"
            />
          </div>
        </div>

        {(element.type === "rect" || element.type === "line") && (
          <>
            <Separator />
            <div className="space-y-4">
              {element.type === "rect" && (
                <div className="space-y-2">
                  <Label className="text-xs">Fill Color</Label>
                  <ColorPicker
                    value={element.style.fill ?? "#ffffff"}
                    onChange={(value) =>
                      onElementChange({ style: { ...element.style, fill: value } })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Stroke Color</Label>
                <ColorPicker
                  value={element.style.stroke ?? "#000000"}
                  onChange={(value) =>
                    onElementChange({ style: { ...element.style, stroke: value } })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Stroke Width</Label>
                <Input
                  type="number"
                  value={element.style.strokeWidth ?? 1}
                  onChange={(e) =>
                    onElementChange({
                      style: { ...element.style, strokeWidth: parseFloat(e.target.value) || 0.5 },
                    })
                  }
                  className="h-8"
                  min={0.1}
                  max={5}
                  step={0.1}
                />
              </div>

              {element.type === "rect" && (
                <div className="space-y-2">
                  <Label className="text-xs">Border Radius</Label>
                  <Input
                    type="number"
                    value={element.style.borderRadius ?? 0}
                    onChange={(e) =>
                      onElementChange({
                        style: { ...element.style, borderRadius: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="h-8"
                    min={0}
                    max={10}
                    step={0.5}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {element.type === "text" && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Font Family</Label>
                <Select
                  value={element.style.fontFamily ?? "Arial"}
                  onValueChange={(value) =>
                    onElementChange({ style: { ...element.style, fontFamily: value } })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Font Size</Label>
                  <Select
                    value={String(element.style.fontSize ?? 10)}
                    onValueChange={(value) =>
                      onElementChange({ style: { ...element.style, fontSize: Number(value) } })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}pt
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Weight</Label>
                  <Select
                    value={element.style.fontWeight ?? "normal"}
                    onValueChange={(value) =>
                      onElementChange({
                        style: { ...element.style, fontWeight: value as "normal" | "bold" },
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Color</Label>
                <ColorPicker
                  value={element.style.color ?? "#000000"}
                  onChange={(value) =>
                    onElementChange({ style: { ...element.style, color: value } })
                  }
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
