import { useDesigner } from "./designer-context";
import { DESIGNER_CONFIG, type ResizeHandle } from "./types";

const { scale: SCALE, handleSize: HANDLE_SIZE, gridSizeMm: GRID_SIZE_MM } = DESIGNER_CONFIG;

export function DesignerCanvas() {
  const {
    spec,
    selectedItem,
    setSelectedItem,
    isDragging,
    setIsDragging,
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    showGrid,
    updateField,
    updateElement,
    snapValue,
    svgRef,
    dragStateRef,
    resizeStateRef,
  } = useDesigner();

  const { width, height } = spec.dimensions;
  const canvasWidth = width * SCALE;
  const canvasHeight = height * SCALE;

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

    if (itemData && dragStateRef.current) {
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
    if (!svg || !dragStateRef.current) return;

    const rect = svg.getBoundingClientRect();
    const { offset } = dragStateRef.current;
    let x = Math.max(0, Math.min(width, (e.clientX - rect.left) / SCALE - offset.x));
    let y = Math.max(0, Math.min(height, (e.clientY - rect.top) / SCALE - offset.y));

    x = snapValue(x);
    y = snapValue(y);

    dragStateRef.current.currentPos = { x, y };

    if (dragStateRef.current.rafId === null) {
      dragStateRef.current.rafId = requestAnimationFrame(() => {
        if (!dragStateRef.current) return;
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
    if (dragStateRef.current?.rafId !== null && dragStateRef.current?.rafId !== undefined) {
      cancelAnimationFrame(dragStateRef.current.rafId);
      dragStateRef.current.rafId = null;
    }

    if (isDragging && selectedItem && dragStateRef.current) {
      const pos = dragStateRef.current.currentPos;
      if (selectedItem.type === "field") {
        updateField(selectedItem.id, { position: pos }, true);
      } else {
        updateElement(selectedItem.id, { position: pos }, true);
      }
    }

    const target = e.currentTarget as SVGGElement;
    target.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (!isDragging && !isResizing && e.target === e.currentTarget) {
      setSelectedItem(null);
    }
  }

  function handleResizeStart(
    e: React.PointerEvent,
    handle: ResizeHandle,
    itemType: "field" | "element",
    itemId: string
  ) {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as SVGRectElement;
    target.setPointerCapture(e.pointerId);

    setIsResizing(true);
    setResizeHandle(handle);

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / SCALE;
    const y = (e.clientY - rect.top) / SCALE;

    const itemData =
      itemType === "field"
        ? spec.fields.find((f) => f.id === itemId)
        : spec.elements.find((el) => el.id === itemId);

    if (itemData && resizeStateRef.current) {
      resizeStateRef.current.startPos = { x, y };
      resizeStateRef.current.startSize = { ...itemData.size };
      resizeStateRef.current.startItemPos = { ...itemData.position };
      resizeStateRef.current.rafId = null;
    }
  }

  function handleResizeMove(e: React.PointerEvent) {
    if (!isResizing || !selectedItem || !resizeHandle) return;

    const svg = svgRef.current;
    if (!svg || !resizeStateRef.current) return;

    const rect = svg.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / SCALE;
    const currentY = (e.clientY - rect.top) / SCALE;

    const { startPos, startSize, startItemPos } = resizeStateRef.current;
    const deltaX = currentX - startPos.x;
    const deltaY = currentY - startPos.y;

    let newWidth = startSize.width;
    let newHeight = startSize.height;
    let newX = startItemPos.x;
    let newY = startItemPos.y;

    if (resizeHandle.includes("e")) {
      newWidth = Math.max(2, snapValue(startSize.width + deltaX));
    }
    if (resizeHandle.includes("w")) {
      const widthDelta = snapValue(deltaX);
      newWidth = Math.max(2, startSize.width - widthDelta);
      newX = snapValue(startItemPos.x + widthDelta);
    }
    if (resizeHandle.includes("s")) {
      newHeight = Math.max(2, snapValue(startSize.height + deltaY));
    }
    if (resizeHandle.includes("n")) {
      const heightDelta = snapValue(deltaY);
      newHeight = Math.max(2, startSize.height - heightDelta);
      newY = snapValue(startItemPos.y + heightDelta);
    }

    if (resizeStateRef.current.rafId === null) {
      resizeStateRef.current.rafId = requestAnimationFrame(() => {
        if (!resizeStateRef.current) return;
        resizeStateRef.current.rafId = null;
        if (selectedItem.type === "field") {
          updateField(selectedItem.id, {
            position: { x: newX, y: newY },
            size: { width: newWidth, height: newHeight },
          });
        } else {
          updateElement(selectedItem.id, {
            position: { x: newX, y: newY },
            size: { width: newWidth, height: newHeight },
          });
        }
      });
    }
  }

  function handleResizeEnd(e: React.PointerEvent) {
    if (resizeStateRef.current?.rafId !== null && resizeStateRef.current?.rafId !== undefined) {
      cancelAnimationFrame(resizeStateRef.current.rafId);
      resizeStateRef.current.rafId = null;
    }

    if (isResizing && selectedItem) {
      const itemData =
        selectedItem.type === "field"
          ? spec.fields.find((f) => f.id === selectedItem.id)
          : spec.elements.find((el) => el.id === selectedItem.id);

      if (itemData) {
        if (selectedItem.type === "field") {
          updateField(selectedItem.id, {
            position: itemData.position,
            size: itemData.size,
          }, true);
        } else {
          updateElement(selectedItem.id, {
            position: itemData.position,
            size: itemData.size,
          }, true);
        }
      }
    }

    const target = e.currentTarget as SVGRectElement;
    target.releasePointerCapture(e.pointerId);
    setIsResizing(false);
    setResizeHandle(null);
  }

  function renderResizeHandles(
    itemWidth: number,
    itemHeight: number,
    itemType: "field" | "element",
    itemId: string
  ) {
    const handles: { handle: ResizeHandle; x: number; y: number; cursor: string }[] = [
      { handle: "nw", x: -HANDLE_SIZE / 2, y: -HANDLE_SIZE / 2, cursor: "nw-resize" },
      { handle: "ne", x: itemWidth - HANDLE_SIZE / 2, y: -HANDLE_SIZE / 2, cursor: "ne-resize" },
      { handle: "sw", x: -HANDLE_SIZE / 2, y: itemHeight - HANDLE_SIZE / 2, cursor: "sw-resize" },
      { handle: "se", x: itemWidth - HANDLE_SIZE / 2, y: itemHeight - HANDLE_SIZE / 2, cursor: "se-resize" },
    ];

    return handles.map(({ handle, x, y, cursor }) => (
      <rect
        key={handle}
        x={x}
        y={y}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="#3b82f6"
        stroke="#1d4ed8"
        strokeWidth={0.2}
        style={{ cursor }}
        onPointerDown={(e) => handleResizeStart(e, handle, itemType, itemId)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className="touch-none"
      />
    ));
  }

  return (
    <div className="flex-1 bg-muted/50 rounded-lg p-6 overflow-auto flex items-center justify-center">
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
          {showGrid && (
            <defs>
              <pattern
                id="grid"
                width={GRID_SIZE_MM}
                height={GRID_SIZE_MM}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${GRID_SIZE_MM} 0 L 0 0 0 ${GRID_SIZE_MM}`}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={0.1}
                />
              </pattern>
            </defs>
          )}
          {showGrid && (
            <rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="url(#grid)"
            />
          )}
          <rect
            x={spec.margins.left}
            y={spec.margins.top}
            width={width - spec.margins.left - spec.margins.right}
            height={height - spec.margins.top - spec.margins.bottom}
            fill="none"
            stroke="#d1d5db"
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
                <>
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
                  {renderResizeHandles(element.size.width, element.size.height, "element", element.id)}
                </>
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
                <>
                  <rect
                    x={-1}
                    y={-1}
                    width={field.size.width + 2}
                    height={field.size.height + 2}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={0.5}
                  />
                  {renderResizeHandles(field.size.width, field.size.height, "field", field.id)}
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
