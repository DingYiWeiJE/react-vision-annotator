import React, { useCallback, useImperativeHandle, forwardRef, useState, useEffect, useRef } from 'react'
import { Stage, Layer } from 'react-konva'
import type Konva from 'konva'
import type { AnnotationData, Point, DrawingData, DrawingStroke } from '../../types/annotation'
import { ToolMode } from '../../core/tools/ToolController'
import { useAnnotationEngine } from '../hooks/useAnnotationEngine'
import { ImageLayer } from './ImageLayer'
import { ShapeLayer } from './ShapeLayer'
import { InteractionLayer } from './InteractionLayer'
import { DrawingLayer, buildCompositeForExport } from './DrawingLayer'

interface AnnotationCanvasProps {
  image: string
  annotations?: AnnotationData[]
  tool?: ToolMode
  strokeWidth?: number
  color?: string
  readOnly?: boolean
  onChange?: (annotations: AnnotationData[]) => void
  drawingData?: DrawingData
  mosaicPixelSize?: number
  mosaicBrushSize?: number
  brushSize?: number
  eraserSize?: number
  onDrawingChange?: (data: DrawingData) => void
}

interface AnnotationCanvasRef {
  load: (annotations: AnnotationData[]) => void
  export: () => AnnotationData[]
  zoomIn: () => void
  zoomOut: () => void
  rotate: (deg: number) => void
  reset: () => void
  clearSelection: () => void
  deleteSelected: () => void
  exportDrawingImage: () => Promise<Blob | null>
  exportDrawingData: () => DrawingData
  loadDrawingData: (data: DrawingData) => void
  clearDrawing: () => void
}

const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(
  function AnnotationCanvas(props, ref) {
    const {
      image,
      annotations,
      tool: externalTool,
      strokeWidth = 2,
      color = '#ff0000',
      readOnly = false,
      onChange,
      drawingData: initialDrawingData,
      mosaicPixelSize = 10,
      mosaicBrushSize = 20,
      brushSize = 4,
      eraserSize = 20,
      onDrawingChange: onDrawingDataChange,
    } = props

    const engine = useAnnotationEngine(annotations)
    const containerRef = useRef<HTMLDivElement>(null)
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
    const imageRef = useRef<HTMLImageElement | null>(null)

    // 监听容器尺寸变化，Stage 跟随容器大小
    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const ro = new ResizeObserver(([entry]) => {
        const { width: w, height: h } = entry.contentRect
        if (w > 0 && h > 0) setStageSize({ width: w, height: h })
      })
      ro.observe(el)
      return () => ro.disconnect()
    }, [])

    const currentTool = readOnly ? ToolMode.SELECT : (externalTool ?? engine.tool)

    // 初始化绘图数据
    const drawingInitialized = useRef(false)
    useEffect(() => {
      if (drawingInitialized.current) return
      drawingInitialized.current = true
      engine.drawingManager.setMosaicPixelSize(mosaicPixelSize)
      if (initialDrawingData) {
        engine.loadDrawing(initialDrawingData)
      }
    }, [])

    const handleAddShape = useCallback((data: AnnotationData) => {
      engine.addShape(data)
      onChange?.(engine.exportJSON())
    }, [engine, onChange])

    const handleSelect = useCallback((id: string) => {
      engine.selectionManager.select([id])
    }, [engine])

    const handleDragEnd = useCallback((id: string, startPoint: Point, endPoint: Point) => {
      const shape = engine.shapes.find(s => s.id === id)
      if (!shape) return
      engine.updateShape({ ...shape, startPoint, endPoint })
      onChange?.(engine.exportJSON())
    }, [engine, onChange])

    const handleResize = useCallback((id: string, startPoint: Point, endPoint: Point) => {
      const shape = engine.shapes.find(s => s.id === id)
      if (!shape) return
      engine.updateShape({ ...shape, startPoint, endPoint })
      onChange?.(engine.exportJSON())
    }, [engine, onChange])

    const handleDeleteSelected = useCallback(() => {
      const selected = engine.selectionManager.getSelectedIds()
      selected.forEach(id => engine.removeShape(id))
      engine.clearSelection()
      onChange?.(engine.exportJSON())
    }, [engine, onChange])

    const handleUndo = useCallback(() => {
      engine.undo()
      onChange?.(engine.exportJSON())
    }, [engine, onChange])

    const handleRedo = useCallback(() => {
      engine.redo()
      onChange?.(engine.exportJSON())
    }, [engine, onChange])

    const screenToImage = useCallback((x: number, y: number): Point => {
      return engine.viewportController.screenToImage(x, y)
    }, [engine])

    const handleImageLoad = useCallback((imgWidth: number, imgHeight: number) => {
      setImageSize({ width: imgWidth, height: imgHeight })
    }, [])

    const handleImageElement = useCallback((img: HTMLImageElement) => {
      imageRef.current = img
    }, [])

    const handleFreehandStroke = useCallback((type: 'mosaic' | 'brush' | 'erase', points: number[], strokeColor?: string) => {
      let size: number
      if (type === 'mosaic') size = mosaicBrushSize
      else if (type === 'brush') size = brushSize
      else size = eraserSize
      engine.addDrawingStroke(type, points, size, strokeColor)
      onDrawingDataChange?.(engine.exportDrawing())
    }, [engine, mosaicBrushSize, brushSize, eraserSize, onDrawingDataChange])

    useImperativeHandle(ref, () => ({
      load: (data: AnnotationData[]) => {
        engine.load(data)
        onChange?.(data)
      },
      export: () => engine.exportJSON(),
      zoomIn: () => engine.zoomIn(),
      zoomOut: () => engine.zoomOut(),
      rotate: (deg: number) => engine.viewportController.rotateAt(deg, stageSize.width / 2, stageSize.height / 2),
      reset: () => engine.reset(),
      clearSelection: () => engine.clearSelection(),
      deleteSelected: handleDeleteSelected,
      exportDrawingImage: async (): Promise<Blob | null> => {
        const img = imageRef.current
        if (!img) return null
        const data = engine.exportDrawing()
        if (data.strokes.length === 0) return null
        const resultCanvas = buildCompositeForExport(img, data.strokes, data.mosaicPixelSize)
        return new Promise((resolve) => {
          resultCanvas.toBlob((blob) => resolve(blob), 'image/png')
        })
      },
      exportDrawingData: () => engine.exportDrawing(),
      loadDrawingData: (data: DrawingData) => {
        engine.loadDrawing(data)
        onDrawingDataChange?.(data)
      },
      clearDrawing: () => {
        engine.clearDrawing()
        onDrawingDataChange?.(engine.exportDrawing())
      },
    }), [engine, onChange, handleDeleteSelected, onDrawingDataChange, stageSize])

    const handleStageClick = useCallback((e: { target: { getStage: () => unknown } }) => {
      // 仅当点击的是 Stage 本身（空白区域）时清除选中
      if (e.target === e.target.getStage()) {
        engine.clearSelection()
      }
    }, [engine])

    const isSelectMode = currentTool === ToolMode.SELECT
    const [isDrawing, setIsDrawing] = useState(false)
    const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(null)
    const stageRef = useRef<Konva.Stage>(null)

    // 切换离开 SELECT 模式时清除选中
    useEffect(() => {
      if (!isSelectMode) {
        engine.clearSelection()
      }
    }, [isSelectMode])

    // Stage 容器级别处理平移和缩放（不受 Konva 坐标变换影响，图片移出屏幕也能操作）
    useEffect(() => {
      const stage = stageRef.current
      const container = stage?.container()
      if (!stage || !container) return

      let isPanning = false
      let lastX = 0
      let lastY = 0
      // 累积平移量，拖拽过程中直接操作 Konva 节点，不触发 React 重渲染
      let accumDx = 0
      let accumDy = 0

      const onWheel = (e: WheelEvent) => {
        // 如果标注的 onWheel 已处理（选中状态下缩放标注），则不缩放画布
        if (e.defaultPrevented) return
        e.preventDefault()
        const factor = e.deltaY < 0 ? 1.1 : 0.9
        const rect = container.getBoundingClientRect()
        engine.viewportController.zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
      }

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return
        // Ctrl+拖拽 → 框选，不平移
        if (e.ctrlKey || e.metaKey) return
        // 只在 SELECT 模式下平移；DRAW 模式下由 InteractionLayer 处理绘制
        if (currentTool !== ToolMode.SELECT) return

        // 检查是否点击了可拖拽的标注（shapes 在 SELECT 模式下 draggable=true）
        const rect = container.getBoundingClientRect()
        const hit = stage.getIntersection({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        if (hit && hit.draggable()) return

        isPanning = true
        lastX = e.clientX
        lastY = e.clientY
        accumDx = 0
        accumDy = 0
        container.style.cursor = 'grabbing'
      }

      const onMouseMove = (e: MouseEvent) => {
        if (!isPanning) return
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        lastX = e.clientX
        lastY = e.clientY
        // 将屏幕空间 delta 反旋转到 offset 空间
        const rad = (stage.rotation() * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const odx = dx * cos + dy * sin
        const ody = -dx * sin + dy * cos
        accumDx += odx
        accumDy += ody
        // 直接操作 Konva Stage 节点，跳过 React 重渲染
        stage.offsetX(stage.offsetX() - odx)
        stage.offsetY(stage.offsetY() - ody)
        stage.batchDraw()
      }

      const onMouseUp = () => {
        if (!isPanning) return
        isPanning = false
        container.style.cursor = ''
        if (accumDx === 0 && accumDy === 0) {
          // 没有移动 → 纯点击空白区域，清除选中
          engine.clearSelection()
        } else {
          // 拖拽结束，一次性同步到 ViewportController（触发一次 React 重渲染）
          engine.viewportController.pan(accumDx, accumDy)
        }
      }

      container.addEventListener('wheel', onWheel, { passive: false })
      container.addEventListener('mousedown', onMouseDown)
      container.addEventListener('mousemove', onMouseMove)
      container.addEventListener('mouseup', onMouseUp)
      window.addEventListener('mouseup', onMouseUp)

      return () => {
        container.removeEventListener('wheel', onWheel)
        container.removeEventListener('mousedown', onMouseDown)
        container.removeEventListener('mousemove', onMouseMove)
        container.removeEventListener('mouseup', onMouseUp)
        window.removeEventListener('mouseup', onMouseUp)
      }
    }, [engine, currentTool])

    const interactionLayer = !readOnly && (
      <InteractionLayer
        tool={currentTool}
        stageWidth={stageSize.width}
        stageHeight={stageSize.height}
        imageWidth={imageSize.width}
        imageHeight={imageSize.height}
        color={color}
        strokeWidth={strokeWidth}
        screenToImage={screenToImage}
        onAddShape={handleAddShape}
        onSelectByBox={engine.selectByBox}
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
    )

    const shapeLayer = (
      <ShapeLayer
        shapes={engine.shapes}
        selectedIds={engine.selectedIds}
        tool={currentTool}
        listening={!(isSelectMode && isDrawing)}
        onSelect={handleSelect}
        onDragEnd={handleDragEnd}
        onResize={handleResize}
      />
    )

    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
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
          <ImageLayer src={image} onLoad={handleImageLoad} onImageElement={handleImageElement} />
          <DrawingLayer
            image={imageRef.current}
            strokes={engine.drawingData.strokes}
            mosaicPixelSize={engine.drawingData.mosaicPixelSize}
            activeStroke={activeStroke}
          />
        </Layer>
        {/* SELECT 模式：InteractionLayer 在下，ShapeLayer 在上（标注可交互，空白区域穿透到 InteractionLayer）
            DRAW/FREEHAND 模式：ShapeLayer 在下，InteractionLayer 在上（拦截所有绘制事件） */}
        {isSelectMode ? (
          <>
            {interactionLayer}
            {shapeLayer}
          </>
        ) : (
          <>
            {shapeLayer}
            {interactionLayer}
          </>
        )}
      </Stage>
      </div>
    )
  }
)

export { AnnotationCanvas }
export type { AnnotationCanvasRef }
