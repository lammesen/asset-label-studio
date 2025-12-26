import type { LabelSpec, LabelField, LabelElement, LabelFieldType, LabelElementType } from "@/types/label-spec";

export type SelectedItem =
  | { type: "field"; id: string }
  | { type: "element"; id: string }
  | null;

export type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;

export interface DesignerConfig {
  scale: number;
  handleSize: number;
  gridSizeMm: number;
}

export const DESIGNER_CONFIG: DesignerConfig = {
  scale: 3,
  handleSize: 1.5,
  gridSizeMm: 2,
};

export const FIELD_TYPE_LABELS: Record<LabelFieldType, string> = {
  text: "Text Field",
  qrcode: "QR Code",
  barcode: "Barcode",
  image: "Image",
  date: "Date",
};

export const ELEMENT_TYPE_LABELS: Record<LabelElementType, string> = {
  text: "Static Text",
  line: "Line",
  rect: "Rectangle",
  image: "Static Image",
  logo: "Logo",
};

export const ASSET_FIELD_OPTIONS = [
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
] as const;

export type { LabelSpec, LabelField, LabelElement, LabelFieldType, LabelElementType };
