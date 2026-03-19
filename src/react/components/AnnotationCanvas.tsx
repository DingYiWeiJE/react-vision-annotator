import React, {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
  useRef,
} from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import type {
  AnnotationData,
  Point,
  DrawingData,
  DrawingStroke,
} from "../../types/annotation";
import { ToolMode } from "../../core/tools/ToolController";
import { useAnnotationEngine } from "../hooks/useAnnotationEngine";
import { ImageLayer } from "./ImageLayer";
import { ShapeLayer } from "./ShapeLayer";
import { InteractionLayer } from "./InteractionLayer";
import { DrawingLayer, buildCompositeForExport } from "./DrawingLayer";

interface AnnotationCanvasProps {
  image: string;
  annotations?: AnnotationData[];
  tool?: ToolMode;
  strokeWidth?: number;
  color?: string;
  readOnly?: boolean;
  onChange?: (annotations: AnnotationData[]) => void;
  onSelectionChange?: (ids: string[]) => void;
  onBeforeHistoryChange?: () => void;
  drawingData?: DrawingData;
  mosaicPixelSize?: number;
  mosaicBrushSize?: number;
  brushSize?: number;
  eraserSize?: number;
  onDrawingChange?: (data: DrawingData) => void;
}

interface AnnotationCanvasRef {
  load: (annotations: AnnotationData[]) => void;
  export: () => AnnotationData[];
  getSelected: () => AnnotationData[];
  zoomIn: () => void;
  zoomOut: () => void;
  rotate: (deg: number) => void;
  reset: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  select: (ids: string[]) => void;
  focusOn: (id: string) => void;
  exportDrawingImage: () => Promise<Blob | null>;
  exportDrawingData: () => DrawingData;
  loadDrawingData: (data: DrawingData) => void;
  clearDrawing: () => void;
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
  function AnnotationCanvas(props, ref) {
    const {
      image,
      annotations,
      tool: externalTool,
      strokeWidth = 2,
      color = "#ff0000",
      readOnly = false,
      onChange,
      onSelectionChange,
      onBeforeHistoryChange,
      drawingData: initialDrawingData,
      mosaicPixelSize = 10,
      mosaicBrushSize = 20,
      brushSize = 4,
      eraserSize = 20,
      onDrawingChange: onDrawingDataChange,
    } = props;

    const engine = useAnnotationEngine(annotations);
    const containerRef = useRef<HTMLDivElement>(null);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) setStageSize({ width: w, height: h });
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const currentTool = readOnly
      ? ToolMode.SELECT
      : (externalTool ?? engine.tool);

    const drawingInitialized = useRef(false);
    useEffect(() => {
      if (drawingInitialized.current) return;
      drawingInitialized.current = true;
      engine.drawingManager.setMosaicPixelSize(mosaicPixelSize);
      if (initialDrawingData) {
        engine.loadDrawing(initialDrawingData);
      }
    }, []);

    const handleClearSelection = useCallback(() => {
      engine.clearSelection();
      onSelectionChangeRef.current?.([]);
    }, [engine]);

    const handleAddShape = useCallback(
      (data: AnnotationData) => {
        handleClearSelection();
        engine.addShape(data);
        onChange?.(engine.exportJSON());
      },
      [engine, onChange, handleClearSelection],
    );

    const handleDragEnd = useCallback(
      (id: string, startPoint: Point, endPoint: Point) => {
        const shape = engine.shapes.find((s) => s.id === id);
        if (!shape) return;
        engine.updateShape({ ...shape, startPoint, endPoint });
        onChange?.(engine.exportJSON());
      },
      [engine, onChange],
    );

    const handleResize = useCallback(
      (id: string, startPoint: Point, endPoint: Point) => {
        const shape = engine.shapes.find((s) => s.id === id);
        if (!shape) return;
        engine.updateShape({ ...shape, startPoint, endPoint });
        onChange?.(engine.exportJSON());
      },
      [engine, onChange],
    );

    const handleDeleteSelected = useCallback(() => {
      const selected = engine.selectionManager.getSelectedIds();
      selected.forEach((id) => engine.removeShape(id));
      engine.clearSelection();
      onChange?.(engine.exportJSON());
    }, [engine, onChange]);

    const handleUndo = useCallback(() => {
      onBeforeHistoryChange?.();
      engine.undo();
      onChange?.(engine.exportJSON());
      onDrawingDataChange?.(engine.exportDrawing());
    }, [engine, onChange, onDrawingDataChange, onBeforeHistoryChange]);

    const handleRedo = useCallback(() => {
      onBeforeHistoryChange?.();
      engine.redo();
      onChange?.(engine.exportJSON());
      onDrawingDataChange?.(engine.exportDrawing());
    }, [engine, onChange, onDrawingDataChange, onBeforeHistoryChange]);

    const screenToImage = useCallback(
      (x: number, y: number): Point => {
        return engine.viewportController.screenToImage(x, y);
      },
      [engine],
    );

    const handleImageLoad = useCallback(
      (imgWidth: number, imgHeight: number) => {
        setImageSize({ width: imgWidth, height: imgHeight });
      },
      [],
    );

    const handleImageElement = useCallback((img: HTMLImageElement) => {
      imageRef.current = img;
    }, []);

    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;

    const handleSelect = useCallback(
      (id: string) => {
        engine.selectionManager.select([id]);
        onSelectionChangeRef.current?.(
          engine.selectionManager.getSelectedIds(),
        );
      },
      [engine],
    );

    const handleStageClick = useCallback(
      (e: { target: { getStage: () => unknown } }) => {
        if (e.target === e.target.getStage()) {
          handleClearSelection();
        }
      },
      [handleClearSelection],
    );

    const handleFreehandStroke = useCallback(
      (
        type: "mosaic" | "brush" | "erase",
        points: number[],
        strokeColor?: string,
        fillShape?: "rect" | "circle",
      ) => {
        let size: number;
        if (type === "mosaic") size = mosaicBrushSize;
        else if (type === "brush") size = brushSize;
        else size = eraserSize;
        engine.addDrawingStroke(type, points, size, strokeColor, fillShape);
        onDrawingDataChange?.(engine.exportDrawing());
      },
      [engine, mosaicBrushSize, brushSize, eraserSize, onDrawingDataChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        load: (data: AnnotationData[]) => {
          engine.load(data);
          onChange?.(data);
        },
        export: () => engine.exportJSON(),
        getSelected: () => engine.getSelected(),
        zoomIn: () => engine.zoomIn(),
        zoomOut: () => engine.zoomOut(),
        rotate: (deg: number) =>
          engine.viewportController.rotateAt(
            deg,
            stageSize.width / 2,
            stageSize.height / 2,
          ),
        reset: () => engine.reset(),
        clearSelection: handleClearSelection,
        select: (ids: string[]) => {
          engine.selectionManager.select(ids);
          onSelectionChangeRef.current?.(ids);
        },
        focusOn: (id: string) => {
          const shape = engine.shapes.find((s) => s.id === id);
          if (!shape) return;
          const cx = (shape.startPoint.x + shape.endPoint.x) / 2;
          const cy = (shape.startPoint.y + shape.endPoint.y) / 2;
          const { scale } = engine.viewportController.getState();
          const newOffsetX = stageSize.width / (2 * scale) - cx;
          const newOffsetY = stageSize.height / (2 * scale) - cy;
          const current = engine.viewportController.getState();
          engine.viewportController.pan(
            newOffsetX - current.offsetX,
            newOffsetY - current.offsetY,
          );
        },
        deleteSelected: handleDeleteSelected,
        exportDrawingImage: async (): Promise<Blob | null> => {
          const img = imageRef.current;
          if (!img) return null;
          const data = engine.exportDrawing();
          if (data.strokes.length === 0) return null;
          const resultCanvas = buildCompositeForExport(
            img,
            data.strokes,
            data.mosaicPixelSize,
          );
          return new Promise((resolve) => {
            resultCanvas.toBlob((blob) => resolve(blob), "image/png");
          });
        },
        exportDrawingData: () => engine.exportDrawing(),
        loadDrawingData: (data: DrawingData) => {
          engine.loadDrawing(data);
          onDrawingDataChange?.(data);
        },
        clearDrawing: () => {
          engine.clearDrawing();
          onDrawingDataChange?.(engine.exportDrawing());
        },
      }),
      [engine, onChange, handleDeleteSelected, onDrawingDataChange, stageSize],
    );

    const [isDrawing, setIsDrawing] = useState(false);
    const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(
      null,
    );
    const [spaceHeld, setSpaceHeld] = useState(false);
    const [ctrlHeld, setCtrlHeld] = useState(false);
    const stageRef = useRef<Konva.Stage>(null);
    const previousToolRef = useRef(currentTool);

    useEffect(() => {
      const previousTool = previousToolRef.current;
      const enteringDrawOrErase =
        currentTool !== previousTool &&
        (currentTool === ToolMode.ERASER ||
          currentTool === ToolMode.MOSAIC_DRAW ||
          currentTool === ToolMode.BRUSH_DRAW ||
          currentTool === ToolMode.BRUSH_FILL_RECT ||
          currentTool === ToolMode.BRUSH_FILL_CIRCLE ||
          currentTool === ToolMode.MOSAIC_FILL_RECT ||
          currentTool === ToolMode.MOSAIC_FILL_CIRCLE);

      if (enteringDrawOrErase) {
        handleClearSelection();
      }

      previousToolRef.current = currentTool;
    }, [currentTool, handleClearSelection]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          e.preventDefault();
          setSpaceHeld(true);
        }
        if (e.ctrlKey || e.metaKey) {
          setCtrlHeld(true);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          setSpaceHeld(false);
        }
        if (!e.ctrlKey && !e.metaKey) {
          setCtrlHeld(false);
        }
      };

      const handleWindowBlur = () => {
        setSpaceHeld(false);
        setCtrlHeld(false);
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("blur", handleWindowBlur);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("blur", handleWindowBlur);
      };
    }, []);

    useEffect(() => {
      const stage = stageRef.current;
      const container = stage?.container();
      if (!stage || !container) return;

      let isPanning = false;
      let lastX = 0;
      let lastY = 0;
      let accumDx = 0;
      let accumDy = 0;

      const onWheel = (e: WheelEvent) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const rect = container.getBoundingClientRect();
        engine.viewportController.zoomAt(
          factor,
          e.clientX - rect.left,
          e.clientY - rect.top,
        );
      };

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0 || !spaceHeld) return;

        const rect = container.getBoundingClientRect();
        const hit = stage.getIntersection({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        if (hit) {
          let node = hit as {
            draggable: () => boolean;
            getParent: () => unknown;
          } | null;
          while (node) {
            if (node.draggable()) return;
            node = node.getParent() as typeof node | null;
          }
        }

        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        accumDx = 0;
        accumDy = 0;
        container.style.cursor = "grabbing";
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        const rad = (stage.rotation() * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const odx = dx * cos + dy * sin;
        const ody = -dx * sin + dy * cos;
        accumDx += odx;
        accumDy += ody;
        stage.offsetX(stage.offsetX() - odx);
        stage.offsetY(stage.offsetY() - ody);
        stage.batchDraw();
      };

      const onMouseUp = () => {
        if (!isPanning) return;
        isPanning = false;
        container.style.cursor = spaceHeld ? "grab" : "";
        if (accumDx === 0 && accumDy === 0) {
          handleClearSelection();
        } else {
          engine.viewportController.pan(accumDx, accumDy);
        }
      };

      container.addEventListener("wheel", onWheel, { passive: false });
      container.addEventListener("mousedown", onMouseDown);
      container.addEventListener("mousemove", onMouseMove);
      container.addEventListener("mouseup", onMouseUp);
      window.addEventListener("mouseup", onMouseUp);

      return () => {
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("mousedown", onMouseDown);
        container.removeEventListener("mousemove", onMouseMove);
        container.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }, [engine, spaceHeld]);

    useEffect(() => {
      const stage = stageRef.current;
      const container = stage?.container();
      if (!container) return;
      if (spaceHeld) {
        container.style.cursor = "grab";
        return () => {
          container.style.cursor = "";
        };
      }
      if (container.style.cursor === "grab") {
        container.style.cursor = "";
      }
    }, [spaceHeld]);

    const interactionLayer = !readOnly && (
      <InteractionLayer
        tool={currentTool}
        stageWidth={stageSize.width}
        stageHeight={stageSize.height}
        imageWidth={imageSize.width}
        imageHeight={imageSize.height}
        color={color}
        strokeWidth={strokeWidth}
        ctrlHeld={ctrlHeld}
        spaceHeld={spaceHeld}
        screenToImage={screenToImage}
        onAddShape={handleAddShape}
        onSelectByBox={(box) => {
          engine.selectByBox(box);
          onSelectionChangeRef.current?.(
            engine.selectionManager.getSelectedIds(),
          );
        }}
        onClearSelection={engine.clearSelection}
        onDeleteSelected={handleDeleteSelected}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDrawingChange={setIsDrawing}
        mosaicBrushSize={mosaicBrushSize}
        brushSize={brushSize}
        eraserSize={eraserSize}
        onFreehandStroke={handleFreehandStroke}
        onActiveStrokeChange={setActiveStroke}
      />
    );

    const shapeLayer = (
      <ShapeLayer
        shapes={engine.shapes}
        selectedIds={engine.selectedIds}
        ctrlHeld={ctrlHeld}
        listening={ctrlHeld && !isDrawing}
        onSelect={handleSelect}
        onDragEnd={handleDragEnd}
        onResize={handleResize}
      />
    );

    return (
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={engine.viewport.scale}
          scaleY={engine.viewport.scale}
          rotation={engine.viewport.rotation}
          offsetX={-engine.viewport.offsetX}
          offsetY={-engine.viewport.offsetY}
          onClick={handleStageClick}
        >
          <Layer>
            <ImageLayer
              src={image}
              onLoad={handleImageLoad}
              onImageElement={handleImageElement}
            />
            <DrawingLayer
              image={imageRef.current}
              strokes={engine.drawingData.strokes}
              mosaicPixelSize={engine.drawingData.mosaicPixelSize}
              activeStroke={activeStroke}
            />
          </Layer>
          {interactionLayer}
          {shapeLayer}
        </Stage>
      </div>
    );
  },
);

export { AnnotationCanvas };
export type { AnnotationCanvasRef };
