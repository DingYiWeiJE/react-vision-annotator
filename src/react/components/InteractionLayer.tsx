import React, { useState, useCallback, useEffect, useRef } from "react";
import { Layer, Rect, Circle as KonvaCircle } from "react-konva";
import type {
  AnnotationData,
  Point,
  DrawingStroke,
} from "../../types/annotation";
import { ToolMode } from "../../core/tools/ToolController";

interface InteractionLayerProps {
  tool: ToolMode;
  stageWidth: number;
  stageHeight: number;
  imageWidth: number;
  imageHeight: number;
  color: string;
  strokeWidth: number;
  ctrlHeld: boolean;
  spaceHeld: boolean;
  screenToImage: (x: number, y: number) => Point;
  onAddShape: (data: AnnotationData) => void;
  onSelectByBox: (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDrawingChange?: (isDrawing: boolean) => void;
  mosaicBrushSize?: number;
  brushSize?: number;
  eraserSize?: number;
  shortcutRadius?: number;
  onFreehandStroke?: (
    type: "mosaic" | "brush" | "erase",
    points: number[],
    color?: string,
    fillShape?: "rect" | "circle",
  ) => void;
  onActiveStrokeChange?: (stroke: DrawingStroke | null) => void;
}

interface DrawingState {
  startPoint: Point;
  currentPoint: Point;
}

let idCounter = 0;
function generateId(): string {
  return `annotation_${Date.now()}_${++idCounter}`;
}

const FREEHAND_TOOLS = new Set([
  ToolMode.MOSAIC_DRAW,
  ToolMode.BRUSH_DRAW,
  ToolMode.ERASER,
]);
const FILL_TOOLS = new Set([
  ToolMode.BRUSH_FILL_RECT,
  ToolMode.BRUSH_FILL_CIRCLE,
  ToolMode.MOSAIC_FILL_RECT,
  ToolMode.MOSAIC_FILL_CIRCLE,
]);
const FILL_RECT_TOOLS = new Set([
  ToolMode.BRUSH_FILL_RECT,
  ToolMode.MOSAIC_FILL_RECT,
]);
const FILL_CIRCLE_TOOLS = new Set([
  ToolMode.BRUSH_FILL_CIRCLE,
  ToolMode.MOSAIC_FILL_CIRCLE,
]);

function getFreehandStrokeType(tool: ToolMode): "mosaic" | "brush" | "erase" {
  if (tool === ToolMode.MOSAIC_DRAW) return "mosaic";
  if (tool === ToolMode.BRUSH_DRAW) return "brush";
  return "erase";
}

function getFillStrokeType(tool: ToolMode): "mosaic" | "brush" {
  if (
    tool === ToolMode.MOSAIC_FILL_RECT ||
    tool === ToolMode.MOSAIC_FILL_CIRCLE
  )
    return "mosaic";
  return "brush";
}

function getFillShape(tool: ToolMode): "rect" | "circle" {
  return FILL_CIRCLE_TOOLS.has(tool) ? "circle" : "rect";
}

function isAnnotateMode(tool: ToolMode): boolean {
  return (
    tool === ToolMode.DRAW_RECT ||
    tool === ToolMode.DRAW_CIRCLE ||
    tool === ToolMode.SELECT
  );
}

function InteractionLayer({
  tool,
  stageWidth,
  stageHeight,
  imageWidth,
  imageHeight,
  color,
  strokeWidth,
  ctrlHeld,
  spaceHeld,
  screenToImage,
  onAddShape,
  onSelectByBox,
  onClearSelection,
  onDeleteSelected,
  onUndo,
  onRedo,
  onDrawingChange,
  mosaicBrushSize = 20,
  brushSize = 4,
  eraserSize = 20,
  shortcutRadius = 40,
  onFreehandStroke,
  onActiveStrokeChange,
}: InteractionLayerProps) {
  const [drawing, setDrawing] = useState<DrawingState | null>(null);
  const drawingRef = useRef<DrawingState | null>(null);
  const lastMousePointRef = useRef<Point | null>(null);
  const stageRectRef = useRef<DOMRect | null>(null);
  const shortcutKeyHeldRef = useRef<{ c: boolean; s: boolean }>({
    c: false,
    s: false,
  });
  const freehandPointsRef = useRef<number[]>([]);
  const isFreehandMode = FREEHAND_TOOLS.has(tool);
  const isFillMode = FILL_TOOLS.has(tool);
  const [mousePos, setMousePos] = useState<Point | null>(null);

  const activeFreehandSize =
    tool === ToolMode.MOSAIC_DRAW
      ? mosaicBrushSize
      : tool === ToolMode.BRUSH_DRAW
        ? brushSize
        : eraserSize;

  useEffect(() => {
    drawingRef.current = drawing;
    onDrawingChange?.(drawing !== null);
  }, [drawing, onDrawingChange]);

  useEffect(() => {
    if (!isFreehandMode || ctrlHeld || spaceHeld) setMousePos(null);
  }, [isFreehandMode, ctrlHeld, spaceHeld]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        onDeleteSelected();
      } else if (e.key === "Escape") {
        setDrawing(null);
        freehandPointsRef.current = [];
        onActiveStrokeChange?.(null);
        onClearSelection();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onUndo();
      } else if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onRedo();
      }

      const key = e.key.toLowerCase();
      if ((key === "c" || key === "s") && !e.repeat) {
        if (
          !isAnnotateMode(tool) ||
          ctrlHeld ||
          spaceHeld ||
          drawingRef.current
        )
          return;
        const center = lastMousePointRef.current;
        if (!center) return;

        if (key === "c") {
          if (shortcutKeyHeldRef.current.c) return;
          shortcutKeyHeldRef.current.c = true;
          const radius = shortcutRadius;
          if (radius <= 2) return;
          onAddShape({
            id: generateId(),
            type: "circle",
            startPoint: center,
            endPoint: { x: center.x + radius, y: center.y },
            color,
            strokeWidth,
          });
        } else {
          if (shortcutKeyHeldRef.current.s) return;
          shortcutKeyHeldRef.current.s = true;
          const radius = shortcutRadius;
          if (radius <= 2) return;
          onAddShape({
            id: generateId(),
            type: "rect",
            startPoint: { x: center.x - radius, y: center.y - radius },
            endPoint: { x: center.x + radius, y: center.y + radius },
            color,
            strokeWidth,
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "c") shortcutKeyHeldRef.current.c = false;
      if (key === "s") shortcutKeyHeldRef.current.s = false;
    };

    const handleBlur = () => {
      shortcutKeyHeldRef.current.c = false;
      shortcutKeyHeldRef.current.s = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [
    onDeleteSelected,
    onClearSelection,
    onUndo,
    onRedo,
    onActiveStrokeChange,
    tool,
    ctrlHeld,
    spaceHeld,
    imageWidth,
    imageHeight,
    shortcutRadius,
    onAddShape,
    color,
    strokeWidth,
  ]);

  const buildActiveStroke = useCallback(
    (): DrawingStroke => ({
      id: "active",
      type: getFreehandStrokeType(tool),
      points: freehandPointsRef.current,
      brushSize: activeFreehandSize,
      color: tool === ToolMode.BRUSH_DRAW ? color : undefined,
    }),
    [tool, activeFreehandSize, color],
  );

  const handleMouseDown = useCallback(
    (e: { evt: MouseEvent }) => {
      if (e.evt.button !== 0 || spaceHeld) return;

      const target = e.evt.target;
      if (target instanceof HTMLElement) {
        stageRectRef.current = target.getBoundingClientRect();
      }

      const pos = screenToImage(e.evt.offsetX, e.evt.offsetY);

      if (isFreehandMode && !ctrlHeld) {
        freehandPointsRef.current = [pos.x, pos.y];
        onActiveStrokeChange?.(buildActiveStroke());
      }

      setDrawing({ startPoint: pos, currentPoint: pos });
    },
    [
      screenToImage,
      spaceHeld,
      ctrlHeld,
      imageWidth,
      imageHeight,
      isFreehandMode,
      buildActiveStroke,
      onActiveStrokeChange,
    ],
  );

  const handleMouseMove = useCallback(
    (e: { evt: MouseEvent }) => {
      const target = e.evt.target;
      if (target instanceof HTMLElement) {
        stageRectRef.current = target.getBoundingClientRect();
      }

      const pos = screenToImage(e.evt.offsetX, e.evt.offsetY);

      if (isFreehandMode) {
        setMousePos(spaceHeld || ctrlHeld ? null : pos);
      }

      lastMousePointRef.current = pos;

      // Active drawing is tracked by the window listener so dragging outside
      // the image keeps the preview aligned with the mouse.
    },
    [
      screenToImage,
      spaceHeld,
      ctrlHeld,
      tool,
      imageWidth,
      imageHeight,
      isFreehandMode,
      isFillMode,
      buildActiveStroke,
      onActiveStrokeChange,
    ],
  );

  useEffect(() => {
    if (!drawing) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const rect = stageRectRef.current;
      if (!rect) return;

      const pos = screenToImage(e.clientX - rect.left, e.clientY - rect.top);

      if (isFreehandMode) {
        setMousePos(spaceHeld || ctrlHeld ? null : pos);
      }

      lastMousePointRef.current = pos;

      const current = drawingRef.current;
      if (!current || spaceHeld) return;

      const { startPoint } = current;

      if (isFreehandMode && !ctrlHeld) {
        freehandPointsRef.current.push(pos.x, pos.y);
        onActiveStrokeChange?.(buildActiveStroke());
        setDrawing({ startPoint, currentPoint: pos });
        return;
      }

      setDrawing({ startPoint, currentPoint: pos });
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => window.removeEventListener("mousemove", handleWindowMouseMove);
  }, [
    drawing,
    screenToImage,
    isFreehandMode,
    spaceHeld,
    ctrlHeld,
    buildActiveStroke,
    onActiveStrokeChange,
  ]);

  const finishDrawing = useCallback(
    (drawState: DrawingState) => {
      if (spaceHeld) {
        setDrawing(null);
        return;
      }

      if (isFreehandMode && !ctrlHeld) {
        const points = freehandPointsRef.current;
        if (points.length >= 2) {
          const strokeType = getFreehandStrokeType(tool);
          const strokeColor = tool === ToolMode.BRUSH_DRAW ? color : undefined;
          onFreehandStroke?.(strokeType, points, strokeColor);
        }
        freehandPointsRef.current = [];
        onActiveStrokeChange?.(null);
        setDrawing(null);
        return;
      }

      if (isFillMode) {
        const { startPoint, currentPoint } = drawState;
        const fillShape = getFillShape(tool);
        const strokeType = getFillStrokeType(tool);
        const strokeColor = strokeType === "brush" ? color : undefined;
        const points = [
          startPoint.x,
          startPoint.y,
          currentPoint.x,
          currentPoint.y,
        ];
        if (fillShape === "rect") {
          const w = Math.abs(currentPoint.x - startPoint.x);
          const h = Math.abs(currentPoint.y - startPoint.y);
          if (w > 2 && h > 2)
            onFreehandStroke?.(strokeType, points, strokeColor, fillShape);
        } else {
          const radius = Math.sqrt(
            (currentPoint.x - startPoint.x) ** 2 +
              (currentPoint.y - startPoint.y) ** 2,
          );
          if (radius > 2)
            onFreehandStroke?.(strokeType, points, strokeColor, fillShape);
        }
        setDrawing(null);
        return;
      }

      const { startPoint, currentPoint } = drawState;

      if (ctrlHeld) {
        const x = Math.min(startPoint.x, currentPoint.x);
        const y = Math.min(startPoint.y, currentPoint.y);
        const w = Math.abs(currentPoint.x - startPoint.x);
        const h = Math.abs(currentPoint.y - startPoint.y);
        onSelectByBox({ x, y, width: w, height: h });
      } else if (tool === ToolMode.DRAW_RECT) {
        const width = Math.abs(currentPoint.x - startPoint.x);
        const height = Math.abs(currentPoint.y - startPoint.y);
        if (width > 2 && height > 2) {
          onAddShape({
            id: generateId(),
            type: "rect",
            startPoint,
            endPoint: currentPoint,
            color,
            strokeWidth,
          });
        }
      } else if (tool === ToolMode.DRAW_CIRCLE) {
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        if (radius > 2) {
          onAddShape({
            id: generateId(),
            type: "circle",
            startPoint,
            endPoint: currentPoint,
            color,
            strokeWidth,
          });
        }
      }

      setDrawing(null);
    },
    [
      spaceHeld,
      isFreehandMode,
      ctrlHeld,
      tool,
      color,
      strokeWidth,
      imageWidth,
      imageHeight,
      onAddShape,
      onSelectByBox,
      isFillMode,
      onFreehandStroke,
      onActiveStrokeChange,
    ],
  );

  const handleMouseUp = useCallback(() => {
    const current = drawingRef.current;
    if (!current) return;
    finishDrawing(current);
  }, [finishDrawing]);

  useEffect(() => {
    if (!drawing) return;

    const handleWindowMouseUp = () => {
      const current = drawingRef.current;
      if (current) {
        finishDrawing(current);
      }
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [drawing, finishDrawing]);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  return (
    <Layer>
      <Rect
        width={imageWidth || stageWidth}
        height={imageHeight || stageHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {drawing && renderPreview(drawing, tool, color, strokeWidth, ctrlHeld)}
      {isFreehandMode && mousePos && (
        <KonvaCircle
          x={mousePos.x}
          y={mousePos.y}
          radius={activeFreehandSize / 2}
          stroke="#666"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Layer>
  );
}

function renderPreview(
  drawing: DrawingState,
  tool: ToolMode,
  color: string,
  strokeWidth: number,
  ctrlHeld: boolean,
): React.ReactNode {
  const { startPoint, currentPoint } = drawing;

  if (ctrlHeld) {
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#1890ff"
        strokeWidth={strokeWidth}
        dash={[6, 3]}
        fill="rgba(24,144,255,0.1)"
        listening={false}
      />
    );
  }

  if (tool === ToolMode.DRAW_RECT) {
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={color}
        strokeWidth={strokeWidth}
        dash={[6, 3]}
        listening={false}
      />
    );
  }

  if (tool === ToolMode.DRAW_CIRCLE) {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    return (
      <KonvaCircle
        x={startPoint.x}
        y={startPoint.y}
        radius={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        dash={[6, 3]}
        listening={false}
      />
    );
  }

  if (FILL_RECT_TOOLS.has(tool)) {
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    const fillColor =
      tool === ToolMode.BRUSH_FILL_RECT ? color + "66" : "rgba(80,80,80,0.4)";
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={tool === ToolMode.BRUSH_FILL_RECT ? color : "#888"}
        strokeWidth={1}
        dash={[4, 3]}
        fill={fillColor}
        listening={false}
      />
    );
  }

  if (FILL_CIRCLE_TOOLS.has(tool)) {
    const dx = currentPoint.x - startPoint.x;
    const dy = currentPoint.y - startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const fillColor =
      tool === ToolMode.BRUSH_FILL_CIRCLE ? color + "66" : "rgba(80,80,80,0.4)";
    return (
      <KonvaCircle
        x={startPoint.x}
        y={startPoint.y}
        radius={radius}
        stroke={tool === ToolMode.BRUSH_FILL_CIRCLE ? color : "#888"}
        strokeWidth={1}
        dash={[4, 3]}
        fill={fillColor}
        listening={false}
      />
    );
  }

  return null;
}

export { InteractionLayer };
