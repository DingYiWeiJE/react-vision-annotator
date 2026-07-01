import React, { useCallback, useState } from "react";
import { Rect, Group, Circle as KonvaCircle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { AnnotationData, Point } from "../../types/annotation";

interface RectShapeViewProps {
  data: AnnotationData;
  selected: boolean;
  ctrlHeld: boolean;
  scale: number;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, startPoint: Point, endPoint: Point) => void;
  onResize: (id: string, startPoint: Point, endPoint: Point) => void;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT_STROKE_WIDTH = 10;
const INACTIVE_HANDLE_OPACITY = 1;
const ACTIVE_HANDLE_OPACITY = 1;

type HandleBubbleEvent = KonvaEventObject<
  MouseEvent | TouchEvent | DragEvent
>;

function RectShapeView({
  data,
  selected,
  ctrlHeld,
  scale,
  onSelect,
  onDragEnd,
  onResize,
}: RectShapeViewProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const startX = data.startPoint.x;
  const startY = data.startPoint.y;
  const endX = data.endPoint.x;
  const endY = data.endPoint.y;

  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  const handleGroupDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleGroupDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      setIsDragging(false);

      const newGroupX = e.target.x();
      const newGroupY = e.target.y();

      const dx = newGroupX - x;
      const dy = newGroupY - y;

      /*
       * Drag 会直接修改 Konva Node 的 x/y。
       * 这里把 Group 立即恢复到 React state 控制的位置，
       * 避免下一次拖拽时累计 offset。
       */
      e.target.position({ x, y });

      onDragEnd(
        data.id,
        {
          x: startX + dx,
          y: startY + dy,
        },
        {
          x: endX + dx,
          y: endY + dy,
        },
      );
    },
    [data.id, endX, endY, onDragEnd, startX, startY, x, y],
  );

  const handleClick = useCallback(() => {
    if (!ctrlHeld) return;
    onSelect(data.id);
  }, [ctrlHeld, data.id, onSelect]);

  const handleMouseEnter = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      setHovered(true);

      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = ctrlHeld ? "grab" : "default";
      }
    },
    [ctrlHeld],
  );

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    setHovered(false);

    const stage = e.target.getStage();
    if (stage) {
      stage.container().style.cursor = "";
    }
  }, []);

  const stopHandleEventBubble = useCallback((e: HandleBubbleEvent) => {
    e.cancelBubble = true;
  }, []);

  const handleHandleDrag = useCallback(
    (handleIndex: number, e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      if (!ctrlHeld) {
        e.target.stopDrag();
        return;
      }

      /*
       * Handle 现在是 Group 子节点。
       * e.target.x/y 是 Group 内局部坐标。
       * Resize 逻辑仍然需要世界坐标，所以这里转回世界坐标。
       */
      const hx = x + e.target.x();
      const hy = y + e.target.y();

      let newStartX = startX;
      let newStartY = startY;
      let newEndX = endX;
      let newEndY = endY;

      const isLeft =
        handleIndex === 0 || handleIndex === 6 || handleIndex === 7;
      const isRight =
        handleIndex === 2 || handleIndex === 3 || handleIndex === 4;
      const isTop = handleIndex === 0 || handleIndex === 1 || handleIndex === 2;
      const isBottom =
        handleIndex === 4 || handleIndex === 5 || handleIndex === 6;

      if (isLeft) {
        if (startX <= endX) {
          newStartX = hx;
        } else {
          newEndX = hx;
        }
      }

      if (isRight) {
        if (startX <= endX) {
          newEndX = hx;
        } else {
          newStartX = hx;
        }
      }

      if (isTop) {
        if (startY <= endY) {
          newStartY = hy;
        } else {
          newEndY = hy;
        }
      }

      if (isBottom) {
        if (startY <= endY) {
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

      /*
       * onResize 后父级 React state 会重新控制 Group 的 x/y。
       * 但当前 drag tick 内 Konva 仍然在使用旧 Group 位置。
       * 因此先把目标 Handle 放回“正确世界坐标相对于当前 Group 的局部坐标”，
       * 避免 Handle 自己累计偏移。
       */
      const correctedGroupX = Math.min(newStartX, newEndX);
      const correctedGroupY = Math.min(newStartY, newEndY);
      const correctedW = Math.abs(newEndX - newStartX);
      const correctedH = Math.abs(newEndY - newStartY);
      const correctedLocalPos = getHandlePositions(
        correctedW,
        correctedH,
      )[handleIndex];

      e.target.position({
        x: correctedGroupX + correctedLocalPos.x - x,
        y: correctedGroupY + correctedLocalPos.y - y,
      });
    },
    [
      ctrlHeld,
      data.id,
      endX,
      endY,
      onResize,
      startX,
      startY,
      x,
      y,
    ],
  );

  const handleHandleDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
    },
    [],
  );

  const handleHandleDragEnd = useCallback(
    (handleIndex: number, e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      handleHandleDrag(handleIndex, e);
    },
    [handleHandleDrag],
  );

  const handleHandleMouseEnter = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (stage) {
        stage.container().style.cursor = ctrlHeld ? "nwse-resize" : "default";
      }
    },
    [ctrlHeld],
  );

  const handleHandleMouseLeave = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
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
    (e: KonvaEventObject<WheelEvent>) => {
      if (!selected || !ctrlHeld) return;

      e.evt.preventDefault();

      const wheelScale = e.evt.deltaY < 0 ? 1.05 : 0.95;
      const cx = x + width / 2;
      const cy = y + height / 2;
      const newW = width * wheelScale;
      const newH = height * wheelScale;
      const newX = cx - newW / 2;
      const newY = cy - newH / 2;
      const sx = startX <= endX;
      const sy = startY <= endY;

      onResize(
        data.id,
        {
          x: sx ? newX : newX + newW,
          y: sy ? newY : newY + newH,
        },
        {
          x: sx ? newX + newW : newX,
          y: sy ? newY + newH : newY,
        },
      );
    },
    [
      ctrlHeld,
      data.id,
      endX,
      endY,
      height,
      onResize,
      selected,
      startX,
      startY,
      width,
      x,
      y,
    ],
  );

  const handles =
    selected && !isDragging ? getHandlePositions(width, height) : [];

  const hoverFill = ctrlHeld && hovered ? data.color + "30" : undefined;

  const strokeColor = ctrlHeld
    ? hovered
      ? lightenColor(data.color)
      : data.color
    : selected
      ? data.color + "CC"
      : data.color;

  const baseStrokeWidth = ctrlHeld
    ? hovered
      ? data.strokeWidth + 1
      : data.strokeWidth
    : selected
      ? data.strokeWidth + 0.5
      : data.strokeWidth;

  const currentStrokeWidth =
    scale > 1 ? baseStrokeWidth / scale : baseStrokeWidth;

  const handleRadius =
    scale > 1 ? HANDLE_SIZE / 2 / scale : HANDLE_SIZE / 2;

  const handleStrokeWidth = scale > 1 ? 1 / scale : 1;

  const handleHitStrokeWidth =
    scale > 1
      ? HANDLE_HIT_STROKE_WIDTH / scale
      : HANDLE_HIT_STROKE_WIDTH;

  return (
    <Group
      x={x}
      y={y}
      draggable={ctrlHeld}
      onDragStart={handleGroupDragStart}
      onDragEnd={handleGroupDragEnd}
    >
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={hoverFill}
        stroke={strokeColor}
        strokeWidth={currentStrokeWidth}
        onClick={handleClick}
        onTap={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      <KonvaCircle
        x={width / 2}
        y={height / 2}
        radius={currentStrokeWidth}
        fill={strokeColor}
        stroke={data.color}
        strokeWidth={1}
      />

      {handles.map((pos, i) => (
        <KonvaCircle
          key={i}
          x={pos.x}
          y={pos.y}
          radius={handleRadius}
          fill="white"
          stroke={data.color}
          strokeWidth={handleStrokeWidth}
          opacity={ctrlHeld ? ACTIVE_HANDLE_OPACITY : INACTIVE_HANDLE_OPACITY}
          hitStrokeWidth={handleHitStrokeWidth}
          draggable={ctrlHeld}
          onMouseDown={stopHandleEventBubble}
          onTouchStart={stopHandleEventBubble}
          onMouseEnter={handleHandleMouseEnter}
          onMouseLeave={handleHandleMouseLeave}
          onDragStart={handleHandleDragStart}
          onDragMove={(e) => handleHandleDrag(i, e)}
          onDragEnd={(e) => handleHandleDragEnd(i, e)}
        />
      ))}
    </Group>
  );
}

function getHandlePositions(w: number, h: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: w / 2, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h / 2 },
    { x: w, y: h },
    { x: w / 2, y: h },
    { x: 0, y: h },
    { x: 0, y: h / 2 },
  ];
}

function lightenColor(color: string): string {
  return color + "80";
}

export { RectShapeView };