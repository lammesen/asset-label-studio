import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from "react";
import type { LabelSpec, LabelField, LabelElement, LabelFieldType, LabelElementType } from "@/types/label-spec";
import {
  DEFAULT_TEXT_STYLE,
  DEFAULT_BARCODE_STYLE,
  DEFAULT_QRCODE_STYLE,
} from "@/types/label-spec";
import { useHistory } from "./use-designer-history";
import { DESIGNER_CONFIG, type SelectedItem, type ResizeHandle } from "./types";

interface DesignerContextValue {
  spec: LabelSpec;
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  isResizing: boolean;
  setIsResizing: (value: boolean) => void;
  resizeHandle: ResizeHandle;
  setResizeHandle: (handle: ResizeHandle) => void;
  snapToGrid: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  updateField: (id: string, updates: Partial<LabelField>, addToHistory?: boolean) => void;
  updateElement: (id: string, updates: Partial<LabelElement>, addToHistory?: boolean) => void;
  addField: (type: LabelFieldType) => void;
  addElement: (type: LabelElementType) => void;
  deleteSelected: () => void;
  updateSpec: (spec: LabelSpec) => void;
  snapValue: (value: number) => number;
  getSelectedField: () => LabelField | undefined;
  getSelectedElement: () => LabelElement | undefined;
  svgRef: React.RefObject<SVGSVGElement | null>;
  dragStateRef: React.RefObject<{
    offset: { x: number; y: number };
    currentPos: { x: number; y: number };
    rafId: number | null;
  }>;
  resizeStateRef: React.RefObject<{
    startPos: { x: number; y: number };
    startSize: { width: number; height: number };
    startItemPos: { x: number; y: number };
    rafId: number | null;
  }>;
}

const DesignerContext = createContext<DesignerContextValue | null>(null);

interface DesignerProviderProps {
  children: ReactNode;
  spec: LabelSpec;
  onSpecChange: (spec: LabelSpec) => void;
}

export function DesignerProvider({ children, spec, onSpecChange }: DesignerProviderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [snapToGrid] = useState(true);
  const [showGrid] = useState(true);

  const { current: historySpec, push: pushHistory, undo, redo, canUndo, canRedo } = useHistory(spec);

  const dragStateRef = useRef<{
    offset: { x: number; y: number };
    currentPos: { x: number; y: number };
    rafId: number | null;
  }>({ offset: { x: 0, y: 0 }, currentPos: { x: 0, y: 0 }, rafId: null });

  const resizeStateRef = useRef<{
    startPos: { x: number; y: number };
    startSize: { width: number; height: number };
    startItemPos: { x: number; y: number };
    rafId: number | null;
  }>({ startPos: { x: 0, y: 0 }, startSize: { width: 0, height: 0 }, startItemPos: { x: 0, y: 0 }, rafId: null });

  const snapValue = useCallback((value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / DESIGNER_CONFIG.gridSizeMm) * DESIGNER_CONFIG.gridSizeMm;
  }, [snapToGrid]);

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

  const updateField = useCallback((id: string, updates: Partial<LabelField>, addToHistory = false) => {
    const newFields = spec.fields.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    );
    const newSpec = { ...spec, fields: newFields };
    if (addToHistory) {
      pushHistory(newSpec);
    }
    onSpecChange(newSpec);
  }, [spec, pushHistory, onSpecChange]);

  const updateElement = useCallback((id: string, updates: Partial<LabelElement>, addToHistory = false) => {
    const newElements = spec.elements.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );
    const newSpec = { ...spec, elements: newElements };
    if (addToHistory) {
      pushHistory(newSpec);
    }
    onSpecChange(newSpec);
  }, [spec, pushHistory, onSpecChange]);

  const addField = useCallback((type: LabelFieldType) => {
    const newField: LabelField = {
      id: crypto.randomUUID(),
      type,
      source: "assetTag",
      position: { x: snapValue(5), y: snapValue(5) },
      size: { width: 30, height: type === "qrcode" ? 15 : 8 },
      style: type === "text" || type === "date"
        ? { ...DEFAULT_TEXT_STYLE }
        : type === "barcode"
        ? { ...DEFAULT_BARCODE_STYLE }
        : type === "qrcode"
        ? { ...DEFAULT_QRCODE_STYLE }
        : { objectFit: "contain" as const, opacity: 1 },
    };
    const newSpec = { ...spec, fields: [...spec.fields, newField] };
    pushHistory(newSpec);
    onSpecChange(newSpec);
    setSelectedItem({ type: "field", id: newField.id });
  }, [spec, snapValue, pushHistory, onSpecChange]);

  const addElement = useCallback((type: LabelElementType) => {
    const newElement: LabelElement = {
      id: crypto.randomUUID(),
      type,
      position: { x: snapValue(5), y: snapValue(5) },
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
    const newSpec = { ...spec, elements: [...spec.elements, newElement] };
    pushHistory(newSpec);
    onSpecChange(newSpec);
    setSelectedItem({ type: "element", id: newElement.id });
  }, [spec, snapValue, pushHistory, onSpecChange]);

  const deleteSelected = useCallback(() => {
    if (!selectedItem) return;

    let newSpec: LabelSpec;
    if (selectedItem.type === "field") {
      newSpec = {
        ...spec,
        fields: spec.fields.filter((f) => f.id !== selectedItem.id),
      };
    } else {
      newSpec = {
        ...spec,
        elements: spec.elements.filter((e) => e.id !== selectedItem.id),
      };
    }
    pushHistory(newSpec);
    onSpecChange(newSpec);
    setSelectedItem(null);
  }, [selectedItem, spec, pushHistory, onSpecChange]);

  const updateSpec = useCallback((newSpec: LabelSpec) => {
    onSpecChange(newSpec);
  }, [onSpecChange]);

  const value: DesignerContextValue = {
    spec: historySpec !== spec ? historySpec : spec,
    selectedItem,
    setSelectedItem,
    isDragging,
    setIsDragging,
    isResizing,
    setIsResizing,
    resizeHandle,
    setResizeHandle,
    snapToGrid,
    showGrid,
    canUndo,
    canRedo,
    undo,
    redo,
    updateField,
    updateElement,
    addField,
    addElement,
    deleteSelected,
    updateSpec,
    snapValue,
    getSelectedField,
    getSelectedElement,
    svgRef,
    dragStateRef,
    resizeStateRef,
  };

  return (
    <DesignerContext.Provider value={value}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner(): DesignerContextValue {
  const context = useContext(DesignerContext);
  if (!context) {
    throw new Error("useDesigner must be used within a DesignerProvider");
  }
  return context;
}
