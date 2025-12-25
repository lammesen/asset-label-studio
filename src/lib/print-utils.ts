import type { LabelUnit, LabelDimensions, LabelSpec } from "@/types/label-spec";
import type { SheetLayout, PaperSize, PAPER_SIZES } from "@/types/print";
import { LABEL_FORMATS } from "@/types/label-spec";

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
const PT_PER_MM = PT_PER_INCH / MM_PER_INCH;

export function mmToPoints(mm: number): number {
  return mm * PT_PER_MM;
}

export function inchesToPoints(inches: number): number {
  return inches * PT_PER_INCH;
}

export function pointsToMm(points: number): number {
  return points / PT_PER_MM;
}

export function pointsToInches(points: number): number {
  return points / PT_PER_INCH;
}

export function toPoints(value: number, unit: LabelUnit): number {
  return unit === "mm" ? mmToPoints(value) : inchesToPoints(value);
}

export function fromPoints(points: number, unit: LabelUnit): number {
  return unit === "mm" ? pointsToMm(points) : pointsToInches(points);
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

export function toMm(value: number, unit: LabelUnit): number {
  return unit === "mm" ? value : inchesToMm(value);
}

export function toInches(value: number, unit: LabelUnit): number {
  return unit === "in" ? value : mmToInches(value);
}

export function dimensionsToPoints(dimensions: LabelDimensions): { width: number; height: number } {
  return {
    width: toPoints(dimensions.width, dimensions.unit),
    height: toPoints(dimensions.height, dimensions.unit),
  };
}

export function dpiToScale(baseDpi: number, targetDpi: number): number {
  return targetDpi / baseDpi;
}

export function pixelsToPoints(pixels: number, dpi: number): number {
  return (pixels / dpi) * PT_PER_INCH;
}

export function pointsToPixels(points: number, dpi: number): number {
  return (points / PT_PER_INCH) * dpi;
}

export function getSheetLayoutForFormat(formatId: string): SheetLayout | null {
  const format = LABEL_FORMATS[formatId as keyof typeof LABEL_FORMATS];
  if (!format || format.labelsPerSheet === 1) {
    return null;
  }

  const letterPaper: PaperSize = { width: 215.9, height: 279.4, unit: "mm" };

  return {
    paperSize: letterPaper,
    labelsPerSheet: format.labelsPerSheet,
    columns: format.columns,
    rows: format.rows,
    marginTop: 12.7,
    marginLeft: 4.8,
    horizontalGap: 3.2,
    verticalGap: 0,
  };
}

export function calculateLabelPositions(
  layout: SheetLayout,
  labelWidth: number,
  labelHeight: number
): Array<{ x: number; y: number; index: number }> {
  const positions: Array<{ x: number; y: number; index: number }> = [];

  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.columns; col++) {
      const x = mmToPoints(layout.marginLeft + col * (labelWidth + layout.horizontalGap));
      const y = mmToPoints(layout.marginTop + row * (labelHeight + layout.verticalGap));
      positions.push({ x, y, index: row * layout.columns + col });
    }
  }

  return positions;
}

export function getFieldValue(asset: Record<string, unknown>, source: string, fallback?: string): string {
  const parts = source.split(".");
  let value: unknown = asset;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return fallback ?? "";
    }
    value = (value as Record<string, unknown>)[part];
  }

  if (value === null || value === undefined) {
    return fallback ?? "";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return String(value);
}

export function formatDate(date: Date | string | null, format: string = "short"): string {
  if (!date) return "";
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return "";

  switch (format) {
    case "iso":
      return d.toISOString().split("T")[0] ?? "";
    case "long":
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    case "short":
    default:
      return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

export function generatePrintFilename(templateName: string, assetCount: number): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const sanitized = sanitizeFilename(templateName);
  return `labels_${sanitized}_${assetCount}x_${timestamp}.pdf`;
}
