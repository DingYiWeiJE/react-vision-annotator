import React, { useCallback } from "react";
import { Layer } from "react-konva";
import type { AnnotationData, Point } from "../../types/annotation";
import { RectShapeView } from "../shapes/RectShapeView";
import { CircleShapeView } from "../shapes/CircleShapeView";

interface ShapeLayerProps {
  shapes: AnnotationData[];
  selectedIds: string[];
  ctrlHeld: boolean;
  listening?: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, startPoint: Point, endPoint: Point) => void;
  onResize: (id: string, startPoint: Point, endPoint: Point) => void;
}

function ShapeLayer({
  shapes,
  selectedIds,
  ctrlHeld,
  listening = true,
  onSelect,
  onDragEnd,
  onResize,
}: ShapeLayerProps) {
  const selectedSet = new Set(selectedIds);

  const visibleShapes = shapes.filter((s) => s.visible !== false);

  return (
    <Layer listening={listening}>
      {visibleShapes.map((shape) => {
        const isSelected = selectedSet.has(shape.id);
        switch (shape.type) {
          case "rect":
            return (
              <RectShapeView
                key={shape.id}
                data={shape}
                selected={isSelected}
                ctrlHeld={ctrlHeld}
                onSelect={onSelect}
                onDragEnd={onDragEnd}
                onResize={onResize}
              />
            );
          case "circle":
            return (
              <CircleShapeView
                key={shape.id}
                data={shape}
                selected={isSelected}
                ctrlHeld={ctrlHeld}
                onSelect={onSelect}
                onDragEnd={onDragEnd}
                onResize={onResize}
              />
            );
          default:
            return null;
        }
      })}
    </Layer>
  );
}

export { ShapeLayer };
