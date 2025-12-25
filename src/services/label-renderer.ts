import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

import type { LabelSpec, LabelField, LabelElement, TextStyle, BarcodeStyle, QRCodeStyle } from "@/types/label-spec";
import type { RenderResult, RenderRequest, RenderAssetData, PrintOptions, SheetLayout } from "@/types/print";
import {
  mmToPoints,
  toPoints,
  dimensionsToPoints,
  getFieldValue,
  getSheetLayoutForFormat,
  calculateLabelPositions,
  generatePrintFilename,
} from "@/lib/print-utils";

interface RenderCache {
  qrCodes: Map<string, string>;
  barcodes: Map<string, string>;
}

interface PDFContext {
  doc: jsPDF;
  offsetX: number;
  offsetY: number;
  labelWidth: number;
  labelHeight: number;
  unit: "mm" | "in";
  cache: RenderCache;
}

function createQRCacheKey(value: string, style: QRCodeStyle, size: number): string {
  return `qr:${value}:${style.errorCorrectionLevel}:${style.margin}:${style.darkColor}:${style.lightColor}:${size}`;
}

function createBarcodeCacheKey(value: string, style: BarcodeStyle, width: number, height: number): string {
  return `bc:${value}:${style.format}:${style.width}:${style.displayValue}:${style.background}:${style.lineColor}:${width}:${height}`;
}

export async function renderLabels(request: RenderRequest): Promise<RenderResult> {
  const { spec, assets, options } = request;
  const dims = dimensionsToPoints(spec.dimensions);
  const sheetLayout = options.useSheetLayout ? getSheetLayoutForFormat(options.format) : null;
  const copies = Math.max(1, Math.min(options.copies ?? 1, 100));

  const expandedAssets: RenderAssetData[] = [];
  for (const asset of assets) {
    for (let c = 0; c < copies; c++) {
      expandedAssets.push(asset);
    }
  }

  const cache: RenderCache = {
    qrCodes: new Map(),
    barcodes: new Map(),
  };

  let doc: jsPDF;
  let pageCount = 0;

  if (sheetLayout) {
    doc = new jsPDF({
      orientation: sheetLayout.paperSize.width > sheetLayout.paperSize.height ? "landscape" : "portrait",
      unit: "pt",
      format: [mmToPoints(sheetLayout.paperSize.width), mmToPoints(sheetLayout.paperSize.height)],
    });

    const positions = calculateLabelPositions(
      sheetLayout,
      spec.dimensions.width,
      spec.dimensions.height
    );

    let positionIndex = 0;
    pageCount = 1;

    for (let i = 0; i < expandedAssets.length; i++) {
      if (positionIndex >= positions.length) {
        doc.addPage();
        pageCount++;
        positionIndex = 0;
      }

      const pos = positions[positionIndex];
      const asset = expandedAssets[i];
      if (!pos || !asset) continue;

      const ctx: PDFContext = {
        doc,
        offsetX: pos.x,
        offsetY: pos.y,
        labelWidth: dims.width,
        labelHeight: dims.height,
        unit: spec.dimensions.unit,
        cache,
      };

      await renderSingleLabel(ctx, spec, asset);
      positionIndex++;
    }
  } else {
    doc = new jsPDF({
      orientation: dims.width > dims.height ? "landscape" : "portrait",
      unit: "pt",
      format: [dims.width, dims.height],
    });

    for (let i = 0; i < expandedAssets.length; i++) {
      const asset = expandedAssets[i];
      if (!asset) continue;

      if (i > 0) {
        doc.addPage([dims.width, dims.height]);
      }

      const ctx: PDFContext = {
        doc,
        offsetX: 0,
        offsetY: 0,
        labelWidth: dims.width,
        labelHeight: dims.height,
        unit: spec.dimensions.unit,
        cache,
      };

      await renderSingleLabel(ctx, spec, asset);
    }
    pageCount = expandedAssets.length;
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return {
    buffer: pdfBuffer,
    mimeType: "application/pdf",
    filename: generatePrintFilename(spec.name, expandedAssets.length),
    pageCount,
  };
}

async function renderSingleLabel(ctx: PDFContext, spec: LabelSpec, asset: RenderAssetData): Promise<void> {
  for (const element of spec.elements) {
    if (element.visible === false) continue;
    await renderElement(ctx, element);
  }

  for (const field of spec.fields) {
    if (field.visible === false) continue;
    if (field.condition && !evaluateCondition(field.condition, asset)) continue;
    await renderField(ctx, field, asset);
  }
}

async function renderElement(ctx: PDFContext, element: LabelElement): Promise<void> {
  const x = ctx.offsetX + toPoints(element.position.x, ctx.unit);
  const y = ctx.offsetY + toPoints(element.position.y, ctx.unit);
  const width = toPoints(element.size.width, ctx.unit);
  const height = toPoints(element.size.height, ctx.unit);

  switch (element.type) {
    case "text":
      renderStaticText(ctx.doc, x, y, width, height, element.content ?? "", element.style);
      break;
    case "rect":
      renderRect(ctx.doc, x, y, width, height, element.style);
      break;
    case "line":
      renderLine(ctx.doc, x, y, width, height, element.style);
      break;
    case "image":
    case "logo":
      if (element.content) {
        await renderImage(ctx.doc, x, y, width, height, element.content);
      }
      break;
  }
}

async function renderField(ctx: PDFContext, field: LabelField, asset: RenderAssetData): Promise<void> {
  const x = ctx.offsetX + toPoints(field.position.x, ctx.unit);
  const y = ctx.offsetY + toPoints(field.position.y, ctx.unit);
  const width = toPoints(field.size.width, ctx.unit);
  const height = toPoints(field.size.height, ctx.unit);
  const value = getFieldValue(asset, field.source, field.fallback);

  switch (field.type) {
    case "text":
    case "date":
      renderTextField(ctx.doc, x, y, width, height, value, field.style as TextStyle);
      break;
    case "barcode":
      await renderBarcode(ctx.doc, x, y, width, height, value, field.style as BarcodeStyle, ctx.cache);
      break;
    case "qrcode":
      await renderQRCode(ctx.doc, x, y, width, height, value, field.style as QRCodeStyle, ctx.cache);
      break;
    case "image":
      if (value) {
        await renderImage(ctx.doc, x, y, width, height, value);
      }
      break;
  }
}

function renderStaticText(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  style: LabelElement["style"]
): void {
  if (!text) return;

  doc.setFont(style.fontFamily ?? "helvetica", style.fontWeight === "bold" ? "bold" : "normal");
  doc.setFontSize(style.fontSize ?? 10);
  doc.setTextColor(style.color ?? "#000000");

  const align = style.textAlign ?? "left";
  let textX = x;
  if (align === "center") textX = x + width / 2;
  else if (align === "right") textX = x + width;

  const textY = y + (style.fontSize ?? 10) * 0.35;

  doc.text(text, textX, textY, { align, maxWidth: width });
}

function renderTextField(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  style: TextStyle
): void {
  if (!text) return;

  const fontStyle = style.fontWeight === "bold" 
    ? (style.fontStyle === "italic" ? "bolditalic" : "bold")
    : (style.fontStyle === "italic" ? "italic" : "normal");

  doc.setFont(mapFontFamily(style.fontFamily), fontStyle);
  doc.setFontSize(style.fontSize);
  doc.setTextColor(style.color);

  let displayText = text;
  if (style.textTransform) {
    switch (style.textTransform) {
      case "uppercase":
        displayText = text.toUpperCase();
        break;
      case "lowercase":
        displayText = text.toLowerCase();
        break;
      case "capitalize":
        displayText = text.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
    }
  }

  let textX = x;
  if (style.textAlign === "center") textX = x + width / 2;
  else if (style.textAlign === "right") textX = x + width;

  let textY = y;
  const lineHeight = style.fontSize * (style.lineHeight ?? 1.2);
  if (style.verticalAlign === "middle") {
    textY = y + height / 2 - lineHeight / 4;
  } else if (style.verticalAlign === "bottom") {
    textY = y + height - lineHeight / 2;
  } else {
    textY = y + style.fontSize * 0.8;
  }

  doc.text(displayText, textX, textY, { align: style.textAlign, maxWidth: width });
}

function renderRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  style: LabelElement["style"]
): void {
  if (style.fill) {
    doc.setFillColor(style.fill);
    doc.rect(x, y, width, height, "F");
  }

  if (style.stroke && style.strokeWidth) {
    doc.setDrawColor(style.stroke);
    doc.setLineWidth(style.strokeWidth);
    doc.rect(x, y, width, height, "S");
  }
}

function renderLine(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  style: LabelElement["style"]
): void {
  doc.setDrawColor(style.stroke ?? "#000000");
  doc.setLineWidth(style.strokeWidth ?? 1);
  doc.line(x, y, x + width, y + height);
}

async function renderBarcode(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  style: BarcodeStyle,
  cache: RenderCache
): Promise<void> {
  if (!value) return;

  try {
    const cacheKey = createBarcodeCacheKey(value, style, width, height);
    let dataUrl = cache.barcodes.get(cacheKey);

    if (!dataUrl) {
      const svgString = createBarcodeSvg(value, style, width, height);
      dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgString).toString("base64")}`;
      cache.barcodes.set(cacheKey, dataUrl);
    }

    doc.addImage(dataUrl, "SVG", x, y, width, height);
  } catch (error) {
    console.error("Barcode rendering failed:", error);
    doc.setFontSize(8);
    doc.setTextColor("#ff0000");
    doc.text("Invalid barcode", x, y + height / 2);
  }
}

function createBarcodeSvg(
  value: string,
  style: BarcodeStyle,
  width: number,
  height: number
): string {
  const svgNs = "http://www.w3.org/2000/svg";
  
  const svgDocument = {
    createElementNS: (_ns: string, tag: string) => {
      const attrs: Record<string, string> = {};
      const children: unknown[] = [];
      return {
        setAttribute: (name: string, val: string) => { attrs[name] = val; },
        appendChild: (child: unknown) => { children.push(child); },
        getAttribute: (name: string) => attrs[name],
        attrs,
        children,
        tag,
      };
    },
    documentElement: { 
      getAttribute: () => null, 
      appendChild: () => {} 
    },
  };

  const svgElement = svgDocument.createElementNS(svgNs, "svg");

  JsBarcode(svgElement as unknown as SVGElement, value, {
    format: style.format,
    width: style.width,
    height: Math.round(height * 0.8),
    displayValue: style.displayValue,
    fontSize: style.fontSize,
    textAlign: style.textAlign,
    background: style.background,
    lineColor: style.lineColor,
    margin: 2,
    xmlDocument: svgDocument as unknown as Document,
  });

  const w = svgElement.attrs["width"] ?? String(Math.round(width));
  const h = svgElement.attrs["height"] ?? String(Math.round(height));

  let svg = `<svg xmlns="${svgNs}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  
  for (const child of svgElement.children) {
    const c = child as { tag: string; attrs: Record<string, string> };
    if (c.tag === "rect") {
      svg += `<rect x="${c.attrs["x"] ?? 0}" y="${c.attrs["y"] ?? 0}" width="${c.attrs["width"]}" height="${c.attrs["height"]}" fill="${c.attrs["fill"] ?? style.background}"/>`;
    } else if (c.tag === "g") {
      const g = child as { tag: string; attrs: Record<string, string>; children: unknown[] };
      svg += `<g>`;
      for (const gc of g.children) {
        const r = gc as { tag: string; attrs: Record<string, string> };
        if (r.tag === "rect") {
          svg += `<rect x="${r.attrs["x"]}" y="${r.attrs["y"]}" width="${r.attrs["width"]}" height="${r.attrs["height"]}" fill="${r.attrs["fill"] ?? style.lineColor}"/>`;
        }
      }
      svg += `</g>`;
    } else if (c.tag === "text") {
      const t = child as { tag: string; attrs: Record<string, string>; children: Array<{ textContent?: string }> };
      const textContent = t.children[0]?.textContent ?? value;
      svg += `<text x="${t.attrs["x"]}" y="${t.attrs["y"]}" fill="${t.attrs["fill"] ?? style.lineColor}" font-size="${t.attrs["font-size"] ?? style.fontSize}" text-anchor="${t.attrs["text-anchor"] ?? "middle"}">${textContent}</text>`;
    }
  }
  
  svg += `</svg>`;
  return svg;
}

async function renderQRCode(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  style: QRCodeStyle,
  cache: RenderCache
): Promise<void> {
  if (!value) return;

  try {
    const size = Math.min(width, height);
    const cacheKey = createQRCacheKey(value, style, size);
    let dataUrl = cache.qrCodes.get(cacheKey);

    if (!dataUrl) {
      dataUrl = await QRCode.toDataURL(value, {
        errorCorrectionLevel: style.errorCorrectionLevel,
        margin: style.margin,
        color: {
          dark: style.darkColor,
          light: style.lightColor,
        },
        width: Math.round(size * 4),
      });
      cache.qrCodes.set(cacheKey, dataUrl);
    }

    const centerX = x + (width - size) / 2;
    const centerY = y + (height - size) / 2;
    doc.addImage(dataUrl, "PNG", centerX, centerY, size, size);
  } catch (error) {
    console.error("QR code rendering failed:", error);
    doc.setFontSize(8);
    doc.setTextColor("#ff0000");
    doc.text("QR Error", x, y + height / 2);
  }
}

async function renderImage(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  src: string
): Promise<void> {
  try {
    if (src.startsWith("data:")) {
      const format = src.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(src, format, x, y, width, height);
    } else {
      console.warn("External image URLs not supported in server-side rendering");
    }
  } catch (error) {
    console.error("Image rendering failed:", error);
  }
}

function evaluateCondition(
  condition: { field: string; operator: string; value?: string },
  asset: RenderAssetData
): boolean {
  const fieldValue = getFieldValue(asset, condition.field);

  switch (condition.operator) {
    case "eq":
      return fieldValue === condition.value;
    case "neq":
      return fieldValue !== condition.value;
    case "contains":
      return fieldValue.includes(condition.value ?? "");
    case "empty":
      return !fieldValue || fieldValue.trim() === "";
    case "notEmpty":
      return !!fieldValue && fieldValue.trim() !== "";
    default:
      return true;
  }
}

function mapFontFamily(fontFamily: string): string {
  const fontMap: Record<string, string> = {
    "Arial": "helvetica",
    "Helvetica": "helvetica",
    "Times New Roman": "times",
    "Times": "times",
    "Courier New": "courier",
    "Courier": "courier",
  };

  return fontMap[fontFamily] ?? "helvetica";
}

export async function renderPreview(spec: LabelSpec, sampleAsset: RenderAssetData): Promise<RenderResult> {
  return renderLabels({
    spec,
    assets: [sampleAsset],
    options: {
      format: "custom",
      outputFormat: "pdf",
      copies: 1,
      useSheetLayout: false,
      dpi: 150,
      previewOnly: true,
    },
  });
}
