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

function clampPoint(p: Point, w: number, h: number): Point {
  return { x: Math.max(0, Math.min(p.x, w)), y: Math.max(0, Math.min(p.y, h)) };
}

function clampCircleEndPoint(
  center: Point,
  endPoint: Point,
  w: number,
  h: number,
): Point {
  const dx = endPoint.x - center.x;
  const dy = endPoint.y - center.y;
  const rawRadius = Math.sqrt(dx * dx + dy * dy);
  if (rawRadius === 0) return endPoint;

  const maxRadius = Math.min(center.x, center.y, w - center.x, h - center.y);
  if (maxRadius <= 0) return center;
  if (rawRadius <= maxRadius) return endPoint;

  const ratio = maxRadius / rawRadius;
  return { x: center.x + dx * ratio, y: center.y + dy * ratio };
}

function isInsideImage(p: Point, w: number, h: number): boolean {
  return p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h;
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

function clampShortcutRadius(
  center: Point,
  radius: number,
  w: number,
  h: number,
): number {
  const maxRadius = Math.min(center.x, center.y, w - center.x, h - center.y);
  return Math.max(0, Math.min(radius, maxRadius));
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
        if (!center || !isInsideImage(center, imageWidth, imageHeight)) return;

        if (key === "c") {
          if (shortcutKeyHeldRef.current.c) return;
          shortcutKeyHeldRef.current.c = true;
          const radius = clampShortcutRadius(
            center,
            shortcutRadius,
            imageWidth,
            imageHeight,
          );
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
          const radius = clampShortcutRadius(
            center,
            shortcutRadius,
            imageWidth,
            imageHeight,
          );
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

      const pos = screenToImage(e.evt.offsetX, e.evt.offsetY);
      if (!ctrlHeld && !isInsideImage(pos, imageWidth, imageHeight)) return;

      const clamped = clampPoint(pos, imageWidth, imageHeight);

      if (isFreehandMode && !ctrlHeld) {
        freehandPointsRef.current = [clamped.x, clamped.y];
        onActiveStrokeChange?.(buildActiveStroke());
      }

      setDrawing({ startPoint: clamped, currentPoint: clamped });
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
      const pos = screenToImage(e.evt.offsetX, e.evt.offsetY);

      if (isFreehandMode) {
        setMousePos(
          spaceHeld || ctrlHeld
            ? null
            : clampPoint(pos, imageWidth, imageHeight),
        );
      }

      lastMousePointRef.current = clampPoint(pos, imageWidth, imageHeight);

      if (!drawingRef.current || spaceHeld) return;

      const { startPoint } = drawingRef.current;

      if (isFreehandMode && !ctrlHeld) {
        const clamped = clampPoint(pos, imageWidth, imageHeight);
        freehandPointsRef.current.push(clamped.x, clamped.y);
        onActiveStrokeChange?.(buildActiveStroke());
        setDrawing({ startPoint, currentPoint: clamped });
        return;
      }

      let currentPoint: Point;
      if (ctrlHeld || isFillMode) {
        currentPoint = clampPoint(pos, imageWidth, imageHeight);
      } else if (tool === ToolMode.DRAW_CIRCLE) {
        currentPoint = clampCircleEndPoint(
          startPoint,
          pos,
          imageWidth,
          imageHeight,
        );
      } else {
        currentPoint = clampPoint(pos, imageWidth, imageHeight);
      }

      if (FILL_CIRCLE_TOOLS.has(tool)) {
        currentPoint = clampCircleEndPoint(
          startPoint,
          pos,
          imageWidth,
          imageHeight,
        );
      }

      setDrawing({ startPoint, currentPoint });
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

      if (
        tool === ToolMode.DRAW_RECT &&
        !ctrlHeld &&
        !isInsideImage(currentPoint, imageWidth, imageHeight)
      ) {
        setDrawing(null);
        return;
      }
      if (tool === ToolMode.DRAW_CIRCLE && !ctrlHeld) {
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = Math.min(
          startPoint.x,
          startPoint.y,
          imageWidth - startPoint.x,
          imageHeight - startPoint.y,
        );
        if (
          radius > maxRadius ||
          !isInsideImage(startPoint, imageWidth, imageHeight)
        ) {
          setDrawing(null);
          return;
        }
      }

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
