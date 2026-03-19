import React, { useState, useCallback } from "react";
import { Rect, Group, Circle as KonvaCircle } from "react-konva";
import type { AnnotationData, Point } from "../../types/annotation";

interface RectShapeViewProps {
  data: AnnotationData;
  selected: boolean;
  ctrlHeld: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, startPoint: Point, endPoint: Point) => void;
  onResize: (id: string, startPoint: Point, endPoint: Point) => void;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT_STROKE_WIDTH = 10;
const INACTIVE_HANDLE_OPACITY = 1;
const ACTIVE_HANDLE_OPACITY = 1;

function RectShapeView({
  data,
  selected,
  ctrlHeld,
  onSelect,
  onDragEnd,
  onResize,
}: RectShapeViewProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const x = Math.min(data.startPoint.x, data.endPoint.x);
  const y = Math.min(data.startPoint.y, data.endPoint.y);
  const width = Math.abs(data.endPoint.x - data.startPoint.x);
  const height = Math.abs(data.endPoint.y - data.startPoint.y);

  const handleDragEnd = useCallback(
    (e: { target: { x: () => number; y: () => number } }) => {
      setIsDragging(false);
      const newX = e.target.x();
      const newY = e.target.y();
      const dx = newX - x;
      const dy = newY - y;
      onDragEnd(
        data.id,
        {
          x: data.startPoint.x + dx,
          y: data.startPoint.y + dy,
        },
        {
          x: data.endPoint.x + dx,
          y: data.endPoint.y + dy,
        },
      );
    },
    [data, x, y, onDragEnd],
  );

  const handleClick = useCallback(() => {
    if (!ctrlHeld) return;
    onSelect(data.id);
  }, [ctrlHeld, data.id, onSelect]);

  const handleMouseEnter = useCallback(
    (e: {
      target: { getStage: () => { container: () => HTMLDivElement } | null };
    }) => {
      setHovered(true);
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = ctrlHeld ? "grab" : "default";
      }
    },
    [ctrlHeld],
  );

  const handleMouseLeave = useCallback(
    (e: {
      target: { getStage: () => { container: () => HTMLDivElement } | null };
    }) => {
      setHovered(false);
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = "";
      }
    },
    [],
  );

  const handleHandleDrag = useCallback(
    (
      handleIndex: number,
      e: { target: { x: (v?: number) => number; y: (v?: number) => number } },
    ) => {
      if (!ctrlHeld) return;
      const hx = e.target.x();
      const hy = e.target.y();

      let newStartX = data.startPoint.x;
      let newStartY = data.startPoint.y;
      let newEndX = data.endPoint.x;
      let newEndY = data.endPoint.y;

      const isLeft =
        handleIndex === 0 || handleIndex === 6 || handleIndex === 7;
      const isRight =
        handleIndex === 2 || handleIndex === 3 || handleIndex === 4;
      const isTop = handleIndex === 0 || handleIndex === 1 || handleIndex === 2;
      const isBottom =
        handleIndex === 4 || handleIndex === 5 || handleIndex === 6;

      if (isLeft) {
        if (data.startPoint.x <= data.endPoint.x) {
          newStartX = hx;
        } else {
          newEndX = hx;
        }
      }
      if (isRight) {
        if (data.startPoint.x <= data.endPoint.x) {
          newEndX = hx;
        } else {
          newStartX = hx;
        }
      }
      if (isTop) {
        if (data.startPoint.y <= data.endPoint.y) {
          newStartY = hy;
        } else {
          newEndY = hy;
        }
      }
      if (isBottom) {
        if (data.startPoint.y <= data.endPoint.y) {
          newEndY = hy;
        } else {
          newStartY = hy;
        }
      }

      onResize(
        data.id,
        { x: newStartX, y: newStartY },
        { x: newEndX, y: newEndY },
      );

      const correctedX = Math.min(newStartX, newEndX);
      const correctedY = Math.min(newStartY, newEndY);
      const correctedW = Math.abs(newEndX - newStartX);
      const correctedH = Math.abs(newEndY - newStartY);
      const correctPos = getHandlePositions(
        correctedX,
        correctedY,
        correctedW,
        correctedH,
      )[handleIndex];
      e.target.x(correctPos.x);
      e.target.y(correctPos.y);
    },
    [data, onResize, ctrlHeld],
  );

  const handleHandleMouseEnter = useCallback(
    (e: {
      target: { getStage: () => { container: () => HTMLDivElement } | null };
    }) => {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = ctrlHeld ? "nwse-resize" : "default";
      }
    },
    [ctrlHeld],
  );

  const handleHandleMouseLeave = useCallback(
    (e: {
      target: { getStage: () => { container: () => HTMLDivElement } | null };
    }) => {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = hovered
          ? ctrlHeld
            ? "grab"
            : "default"
          : "";
      }
    },
    [ctrlHeld, hovered],
  );

  const handleWheel = useCallback(
    (e: { evt: WheelEvent }) => {
      if (!selected || !ctrlHeld) return;
      e.evt.preventDefault();
      const scale = e.evt.deltaY < 0 ? 1.05 : 0.95;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const newW = width * scale;
      const newH = height * scale;
      const newX = cx - newW / 2;
      const newY = cy - newH / 2;
      const sx = data.startPoint.x <= data.endPoint.x;
      const sy = data.startPoint.y <= data.endPoint.y;
      onResize(
        data.id,
        { x: sx ? newX : newX + newW, y: sy ? newY : newY + newH },
        { x: sx ? newX + newW : newX, y: sy ? newY + newH : newY },
      );
    },
    [selected, ctrlHeld, data, x, y, width, height, onResize],
  );

  const handles =
    selected && !isDragging ? getHandlePositions(x, y, width, height) : [];
  const hoverFill = ctrlHeld && hovered ? data.color + "30" : undefined;
  const strokeColor = ctrlHeld
    ? hovered
      ? lightenColor(data.color)
      : data.color
    : selected
      ? data.color + "CC"
      : data.color;
  const currentStrokeWidth = ctrlHeld
    ? hovered
      ? data.strokeWidth + 1
      : data.strokeWidth
    : selected
      ? data.strokeWidth + 0.5
      : data.strokeWidth;

  return (
    <Group>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={hoverFill}
        stroke={strokeColor}
        strokeWidth={currentStrokeWidth}
        draggable={ctrlHeld}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      {handles.map((pos, i) => (
        <KonvaCircle
          key={i}
          x={pos.x}
          y={pos.y}
          radius={HANDLE_SIZE / 2}
          fill="white"
          stroke={data.color}
          strokeWidth={1}
          opacity={ctrlHeld ? ACTIVE_HANDLE_OPACITY : INACTIVE_HANDLE_OPACITY}
          hitStrokeWidth={HANDLE_HIT_STROKE_WIDTH}
          draggable={ctrlHeld}
          onMouseEnter={handleHandleMouseEnter}
          onMouseLeave={handleHandleMouseLeave}
          onDragMove={(e) => handleHandleDrag(i, e)}
        />
      ))}
    </Group>
  );
}

function getHandlePositions(
  x: number,
  y: number,
  w: number,
  h: number,
): Point[] {
  return [
    { x, y },
    { x: x + w / 2, y },
    { x: x + w, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w, y: y + h },
    { x: x + w / 2, y: y + h },
    { x, y: y + h },
    { x, y: y + h / 2 },
  ];
}

function lightenColor(color: string): string {
  return color + "80";
}

export { RectShapeView };
