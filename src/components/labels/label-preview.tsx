import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LabelSpec, LabelField, LabelElement } from "@/types/label-spec";
import type { Asset } from "@/types/asset";

interface LabelPreviewProps {
  spec: LabelSpec;
  asset?: Partial<Asset>;
  scale?: number;
  showBorder?: boolean;
  className?: string;
}

const SAMPLE_ASSET: Partial<Asset> = {
  assetTag: "AST-2024-001234",
  serialNumber: "SN-ABCD1234XYZ",
  manufacturer: "Cisco",
  model: "Catalyst 9300",
  location: "DC-01 Rack A3",
  department: "Network Operations",
  assignedTo: "John Smith",
  category: "networking",
  type: "Switch",
  status: "active",
};

function getAssetValue(asset: Partial<Asset>, source: string): string {
  if (source.startsWith("customFields.")) {
    const fieldName = source.replace("customFields.", "");
    const value = asset.customFields?.[fieldName];
    return value !== undefined ? String(value) : "";
  }
  
  const value = asset[source as keyof Asset];
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

function renderFieldContent(
  field: LabelField,
  asset: Partial<Asset>
): React.ReactNode {
  const value = getAssetValue(asset, field.source) || field.fallback || `{${field.source}}`;

  switch (field.type) {
    case "text":
    case "date": {
      const style = field.style as { fontSize?: number; fontFamily?: string; fontWeight?: string; color?: string };
      return (
        <text
          x={1}
          y={field.size.height * 0.7}
          fontSize={Math.min((style.fontSize ?? 10) * 0.8, field.size.height * 0.8)}
          fontFamily={style.fontFamily ?? "Arial"}
          fontWeight={style.fontWeight ?? "normal"}
          fill={style.color ?? "#000"}
        >
          {value}
        </text>
      );
    }
    case "qrcode": {
      const QR_PATTERN = [
        [1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0],
        [1, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 0],
        [1, 0, 1, 0, 1, 0, 1],
      ];
      const cellSize = (field.size.width * 0.8) / 7;
      return (
        <g>
          <rect
            width={field.size.width}
            height={field.size.height}
            fill="#fff"
            stroke="#000"
            strokeWidth={0.2}
          />
          <g transform={`translate(${field.size.width * 0.1}, ${field.size.height * 0.1})`}>
            {QR_PATTERN.map((rowData, row) =>
              rowData.map((cell, col) =>
                cell === 1 ? (
                  <rect
                    key={`${row}-${col}`}
                    x={col * cellSize}
                    y={row * cellSize}
                    width={cellSize * 0.9}
                    height={cellSize * 0.9}
                    fill="#000"
                  />
                ) : null
              )
            )}
          </g>
        </g>
      );
    }
    case "barcode":
      return (
        <g>
          <rect
            width={field.size.width}
            height={field.size.height}
            fill="#fff"
          />
          {Array.from({ length: 20 }).map((_, i) => (
            <rect
              key={i}
              x={1 + i * (field.size.width - 2) / 20}
              y={1}
              width={(field.size.width - 2) / 40}
              height={field.size.height * 0.7}
              fill={i % 3 === 0 ? "#000" : i % 2 === 0 ? "#000" : "transparent"}
            />
          ))}
          <text
            x={field.size.width / 2}
            y={field.size.height - 1}
            fontSize={Math.min(6, field.size.height * 0.2)}
            fontFamily="monospace"
            textAnchor="middle"
            fill="#000"
          >
            {value.slice(0, 15)}
          </text>
        </g>
      );
    case "image":
      return (
        <rect
          width={field.size.width}
          height={field.size.height}
          fill="#f3f4f6"
          stroke="#d1d5db"
          strokeWidth={0.2}
        />
      );
    default:
      return null;
  }
}

function renderElement(element: LabelElement): React.ReactNode {
  switch (element.type) {
    case "rect":
      return (
        <rect
          width={element.size.width}
          height={element.size.height}
          fill={element.style.fill ?? "transparent"}
          stroke={element.style.stroke ?? "none"}
          strokeWidth={element.style.strokeWidth ?? 1}
          rx={element.style.borderRadius ?? 0}
        />
      );
    case "line":
      return (
        <line
          x1={0}
          y1={0}
          x2={element.size.width}
          y2={0}
          stroke={element.style.stroke ?? "#000"}
          strokeWidth={element.style.strokeWidth ?? 0.5}
        />
      );
    case "text":
      return (
        <text
          fontSize={element.style.fontSize ?? 10}
          fontFamily={element.style.fontFamily ?? "Arial"}
          fontWeight={element.style.fontWeight ?? "normal"}
          fill={element.style.color ?? "#000"}
        >
          {element.content}
        </text>
      );
    case "image":
    case "logo":
      return (
        <rect
          width={element.size.width}
          height={element.size.height}
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth={0.2}
        />
      );
    default:
      return null;
  }
}

export function LabelPreview({
  spec,
  asset,
  scale = 3,
  showBorder = true,
  className,
}: LabelPreviewProps) {
  const previewAsset = useMemo(() => ({ ...SAMPLE_ASSET, ...asset }), [asset]);
  
  const { width, height } = spec.dimensions;
  const canvasWidth = width * scale;
  const canvasHeight = height * scale;

  return (
    <div
      className={className}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#fff",
        boxShadow: showBorder ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
      }}
    >
      <svg
        width={canvasWidth}
        height={canvasHeight}
        viewBox={`0 0 ${width} ${height}`}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="#fff"
        />

        {spec.elements.map((element) => (
          <g
            key={element.id}
            transform={`translate(${element.position.x}, ${element.position.y})${
              element.rotation ? ` rotate(${element.rotation})` : ""
            }`}
          >
            {renderElement(element)}
          </g>
        ))}

        {spec.fields.map((field) => (
          <g
            key={field.id}
            transform={`translate(${field.position.x}, ${field.position.y})${
              field.rotation ? ` rotate(${field.rotation})` : ""
            }`}
          >
            {renderFieldContent(field, previewAsset)}
          </g>
        ))}
      </svg>
    </div>
  );
}

interface LabelPreviewCardProps {
  spec: LabelSpec;
  asset?: Partial<Asset>;
  title?: string;
}

export function LabelPreviewCard({ spec, asset, title = "Preview" }: LabelPreviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center p-4 bg-gray-50 rounded-b-lg">
        <LabelPreview spec={spec} asset={asset} scale={4} />
      </CardContent>
    </Card>
  );
}
