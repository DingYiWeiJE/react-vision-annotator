import React, { useState, useCallback } from "react";
import { Circle as KonvaCircle, Group } from "react-konva";
import type { AnnotationData, Point } from "../../types/annotation";

interface CircleShapeViewProps {
  data: AnnotationData;
  selected: boolean;
  ctrlHeld: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, startPoint: Point, endPoint: Point) => void;
  onResize: (id: string, startPoint: Point, endPoint: Point) => void;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT_STROKE_WIDTH = 10;
const INACTIVE_HANDLE_OPACITY = 0.45;
const ACTIVE_HANDLE_OPACITY = 1;

function CircleShapeView({
  data,
  selected,
  ctrlHeld,
  onSelect,
  onDragEnd,
  onResize,
}: CircleShapeViewProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const cx = data.startPoint.x;
  const cy = data.startPoint.y;
  const dx = data.endPoint.x - data.startPoint.x;
  const dy = data.endPoint.y - data.startPoint.y;
  const radius = Math.sqrt(dx * dx + dy * dy);

  const handleDragEnd = useCallback(
    (e: {
      target: { x: (v?: number) => number; y: (v?: number) => number };
    }) => {
      setIsDragging(false);
      const newCx = e.target.x();
      const newCy = e.target.y();
      const moveDx = newCx - cx;
      const moveDy = newCy - cy;
      e.target.x(cx);
      e.target.y(cy);
      onDragEnd(
        data.id,
        {
          x: data.startPoint.x + moveDx,
          y: data.startPoint.y + moveDy,
        },
        {
          x: data.endPoint.x + moveDx,
          y: data.endPoint.y + moveDy,
        },
      );
    },
    [data, cx, cy, onDragEnd],
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
      const hdx = hx - cx;
      const hdy = hy - cy;
      const newRadius = Math.sqrt(hdx * hdx + hdy * hdy);

      onResize(data.id, data.startPoint, { x: cx + newRadius, y: cy });

      const handlePositions = [
        { x: cx, y: cy - newRadius },
        { x: cx + newRadius, y: cy },
        { x: cx, y: cy + newRadius },
        { x: cx - newRadius, y: cy },
      ];
      e.target.x(handlePositions[handleIndex].x);
      e.target.y(handlePositions[handleIndex].y);
    },
    [data, cx, cy, onResize, ctrlHeld],
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
      const newRadius = radius * scale;
      onResize(data.id, data.startPoint, { x: cx + newRadius, y: cy });
    },
    [selected, ctrlHeld, data, cx, cy, radius, onResize],
  );

  const handles =
    selected && !isDragging
      ? [
          { x: cx, y: cy - radius },
          { x: cx + radius, y: cy },
          { x: cx, y: cy + radius },
          { x: cx - radius, y: cy },
        ]
      : [];

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
      <Group
        x={cx}
        y={cy}
        draggable={ctrlHeld}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <KonvaCircle
          radius={radius}
          fill={hoverFill}
          stroke={strokeColor}
          strokeWidth={currentStrokeWidth}
          onClick={handleClick}
          onTap={handleClick}
          onWheel={handleWheel}
        />
        <KonvaCircle
          radius={HANDLE_SIZE / 2}
          fill={data.color}
          stroke={data.color}
          strokeWidth={2}
          listening={false}
        />
      </Group>
      {handles.map((pos, i) => (
        <KonvaCircle
          key={i}
          x={pos.x}
          y={pos.y}
          radius={HANDLE_SIZE / 2}
          fill={ctrlHeld ? "white" : data.color + "CC"}
          stroke={data.color}
          strokeWidth={ctrlHeld ? 1 : 0}
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

function lightenColor(color: string): string {
  return color + "80";
}

export { CircleShapeView };
