/**
 * LabelSpec is the single source of truth for label rendering
 * This JSON structure is what gets stored, versioned, and rendered
 */

export type LabelUnit = "mm" | "in";

export interface LabelDimensions {
  width: number;
  height: number;
  unit: LabelUnit;
}

export interface LabelPosition {
  x: number;
  y: number;
}

export interface LabelSize {
  width: number;
  height: number;
}

/**
 * Main LabelSpec interface
 */
export interface LabelSpec {
  id: string;
  version: string;
  name: string;
  description?: string;
  
  // Physical dimensions
  dimensions: LabelDimensions;
  dpi: number;
  
  // Margins (in the same unit as dimensions)
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Fields and elements
  fields: LabelField[];
  elements: LabelElement[];
}

/**
 * Field types for dynamic content
 */
export type LabelFieldType = "text" | "qrcode" | "barcode" | "image" | "date";

/**
 * Barcode formats supported
 */
export type BarcodeFormat = 
  | "CODE128" 
  | "CODE39" 
  | "EAN13" 
  | "EAN8" 
  | "UPC" 
  | "ITF14"
  | "MSI"
  | "pharmacode";

/**
 * Text alignment options
 */
export type TextAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";

/**
 * Text style configuration
 */
export interface TextStyle {
  fontFamily: string;
  fontSize: number; // in points
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  color: string; // hex color
  textAlign: TextAlign;
  verticalAlign: VerticalAlign;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

/**
 * Barcode style configuration
 */
export interface BarcodeStyle {
  format: BarcodeFormat;
  displayValue: boolean;
  fontSize: number;
  textAlign: TextAlign;
  background: string;
  lineColor: string;
  width: number; // bar width multiplier
  height: number; // bar height in mm
}

/**
 * QR code style configuration
 */
export interface QRCodeStyle {
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  margin: number;
  darkColor: string;
  lightColor: string;
}

/**
 * Image style configuration
 */
export interface ImageStyle {
  objectFit: "contain" | "cover" | "fill";
  opacity: number;
}

/**
 * Dynamic field (content from asset data)
 */
export interface LabelField {
  id: string;
  type: LabelFieldType;
  
  // Data binding
  source: string; // Asset field path, e.g., "serialNumber", "customFields.ipAddress"
  fallback?: string; // Fallback value if source is empty
  
  // Position and size (in label units)
  position: LabelPosition;
  size: LabelSize;
  
  // Rotation in degrees
  rotation?: number;
  
  // Type-specific styles
  style: TextStyle | BarcodeStyle | QRCodeStyle | ImageStyle;
  
  // Visibility conditions
  visible?: boolean;
  condition?: FieldCondition;
}

/**
 * Condition for field visibility
 */
export interface FieldCondition {
  field: string; // Asset field to check
  operator: "eq" | "neq" | "contains" | "empty" | "notEmpty";
  value?: string;
}

/**
 * Static element types
 */
export type LabelElementType = "text" | "line" | "rect" | "image" | "logo";

/**
 * Static element (fixed content, not from asset)
 */
export interface LabelElement {
  id: string;
  type: LabelElementType;
  
  // Position and size
  position: LabelPosition;
  size: LabelSize;
  rotation?: number;
  
  // Content (for text and image elements)
  content?: string;
  
  // Style
  style: ElementStyle;
  
  visible?: boolean;
}

/**
 * Element style configuration
 */
export interface ElementStyle {
  // Text styling
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  color?: string;
  textAlign?: TextAlign;
  
  // Shape styling
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  
  // Image styling
  objectFit?: "contain" | "cover" | "fill";
  opacity?: number;
}

/**
 * Pre-defined label formats
 */
export const LABEL_FORMATS = {
  // Avery formats
  "avery-5160": {
    name: "Avery 5160",
    dimensions: { width: 66.7, height: 25.4, unit: "mm" as LabelUnit },
    labelsPerSheet: 30,
    columns: 3,
    rows: 10,
  },
  "avery-5161": {
    name: "Avery 5161",
    dimensions: { width: 101.6, height: 25.4, unit: "mm" as LabelUnit },
    labelsPerSheet: 20,
    columns: 2,
    rows: 10,
  },
  "avery-5163": {
    name: "Avery 5163",
    dimensions: { width: 101.6, height: 50.8, unit: "mm" as LabelUnit },
    labelsPerSheet: 10,
    columns: 2,
    rows: 5,
  },
  "avery-5164": {
    name: "Avery 5164",
    dimensions: { width: 101.6, height: 88.9, unit: "mm" as LabelUnit },
    labelsPerSheet: 6,
    columns: 2,
    rows: 3,
  },
  // DYMO formats
  "dymo-30252": {
    name: "DYMO 30252",
    dimensions: { width: 89, height: 28, unit: "mm" as LabelUnit },
    labelsPerSheet: 1,
    columns: 1,
    rows: 1,
  },
  "dymo-30336": {
    name: "DYMO 30336",
    dimensions: { width: 54, height: 25, unit: "mm" as LabelUnit },
    labelsPerSheet: 1,
    columns: 1,
    rows: 1,
  },
  // Brother formats
  "brother-dk2205": {
    name: "Brother DK-2205",
    dimensions: { width: 62, height: 30.48, unit: "mm" as LabelUnit },
    labelsPerSheet: 1,
    columns: 1,
    rows: 1,
  },
  // Custom
  "custom": {
    name: "Custom",
    dimensions: { width: 50, height: 25, unit: "mm" as LabelUnit },
    labelsPerSheet: 1,
    columns: 1,
    rows: 1,
  },
} as const;

export type LabelFormatId = keyof typeof LABEL_FORMATS;

/**
 * Default text style
 */
export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Arial",
  fontSize: 10,
  fontWeight: "normal",
  fontStyle: "normal",
  color: "#000000",
  textAlign: "left",
  verticalAlign: "top",
};

/**
 * Default barcode style
 */
export const DEFAULT_BARCODE_STYLE: BarcodeStyle = {
  format: "CODE128",
  displayValue: true,
  fontSize: 10,
  textAlign: "center",
  background: "#ffffff",
  lineColor: "#000000",
  width: 2,
  height: 10,
};

/**
 * Default QR code style
 */
export const DEFAULT_QRCODE_STYLE: QRCodeStyle = {
  errorCorrectionLevel: "M",
  margin: 1,
  darkColor: "#000000",
  lightColor: "#ffffff",
};
