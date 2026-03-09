import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Layer, Rect, Circle as KonvaCircle } from 'react-konva'
import type { AnnotationData, Point, DrawingStroke } from '../../types/annotation'
import { ToolMode } from '../../core/tools/ToolController'

interface InteractionLayerProps {
  tool: ToolMode
  stageWidth: number
  stageHeight: number
  imageWidth: number
  imageHeight: number
  color: string
  strokeWidth: number
  screenToImage: (x: number, y: number) => Point
  onAddShape: (data: AnnotationData) => void
  onSelectByBox: (box: { x: number; y: number; width: number; height: number }) => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  onUndo: () => void
  onRedo: () => void
  onDrawingChange?: (isDrawing: boolean) => void
  mosaicBrushSize?: number
  brushSize?: number
  eraserSize?: number
  onFreehandStroke?: (type: 'mosaic' | 'brush' | 'erase', points: number[], color?: string) => void
  onActiveStrokeChange?: (stroke: DrawingStroke | null) => void
}

interface DrawingState {
  startPoint: Point
  currentPoint: Point
}

let idCounter = 0
function generateId(): string {
  return `annotation_${Date.now()}_${++idCounter}`
}

function clampPoint(p: Point, w: number, h: number): Point {
  return { x: Math.max(0, Math.min(p.x, w)), y: Math.max(0, Math.min(p.y, h)) }
}

/** 钳制圆形端点，使整个圆（圆心=center，半径=center到endPoint的距离）不超出图片范围 */
function clampCircleEndPoint(center: Point, endPoint: Point, w: number, h: number): Point {
  const dx = endPoint.x - center.x
  const dy = endPoint.y - center.y
  const rawRadius = Math.sqrt(dx * dx + dy * dy)
  if (rawRadius === 0) return endPoint

  const maxRadius = Math.min(center.x, center.y, w - center.x, h - center.y)
  if (maxRadius <= 0) return center
  if (rawRadius <= maxRadius) return endPoint

  const ratio = maxRadius / rawRadius
  return { x: center.x + dx * ratio, y: center.y + dy * ratio }
}

function isInsideImage(p: Point, w: number, h: number): boolean {
  return p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h
}

const FREEHAND_TOOLS = new Set([ToolMode.MOSAIC_DRAW, ToolMode.BRUSH_DRAW, ToolMode.ERASER])

function getFreehandStrokeType(tool: ToolMode): 'mosaic' | 'brush' | 'erase' {
  if (tool === ToolMode.MOSAIC_DRAW) return 'mosaic'
  if (tool === ToolMode.BRUSH_DRAW) return 'brush'
  return 'erase'
}

function InteractionLayer({
  tool, stageWidth, stageHeight, imageWidth, imageHeight, color, strokeWidth,
  screenToImage, onAddShape, onSelectByBox, onClearSelection,
  onDeleteSelected, onUndo, onRedo, onDrawingChange,
  mosaicBrushSize = 20, brushSize = 4, eraserSize = 20,
  onFreehandStroke, onActiveStrokeChange,
}: InteractionLayerProps) {
  const [drawing, setDrawing] = useState<DrawingState | null>(null)
  const drawingRef = useRef<DrawingState | null>(null)
  const freehandPointsRef = useRef<number[]>([])
  const isFreehandMode = FREEHAND_TOOLS.has(tool)

  // 鼠标在图像上的位置（用于画笔光���）
  const [mousePos, setMousePos] = useState<Point | null>(null)

  const activeFreehandSize = tool === ToolMode.MOSAIC_DRAW ? mosaicBrushSize
    : tool === ToolMode.BRUSH_DRAW ? brushSize
    : eraserSize

  // 同步 ref，让 window 级别的事件回调能拿到最新的 drawing
  useEffect(() => {
    drawingRef.current = drawing
    onDrawingChange?.(drawing !== null)
  }, [drawing])

  // 切换工具时清除光标
  useEffect(() => {
    if (!isFreehandMode) setMousePos(null)
  }, [isFreehandMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteSelected()
      } else if (e.key === 'Escape') {
        setDrawing(null)
        onActiveStrokeChange?.(null)
        onClearSelection()
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onUndo()
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDeleteSelected, onClearSelection, onUndo, onRedo, onActiveStrokeChange])

  /** 构建当前正在绘制的 active stroke 对象 */
  const buildActiveStroke = useCallback((): DrawingStroke => ({
    id: 'active',
    type: getFreehandStrokeType(tool),
    points: freehandPointsRef.current,
    brushSize: activeFreehandSize,
    color: tool === ToolMode.BRUSH_DRAW ? color : undefined,
  }), [tool, activeFreehandSize, color])

  const handleMouseDown = useCallback((e: { evt: MouseEvent }) => {
    if (e.evt.button !== 0) return

    if (tool === ToolMode.SELECT && !(e.evt.ctrlKey || e.evt.metaKey)) return

    const pos = screenToImage(e.evt.offsetX, e.evt.offsetY)

    if (tool !== ToolMode.SELECT && !isInsideImage(pos, imageWidth, imageHeight)) return

    const clamped = clampPoint(pos, imageWidth, imageHeight)

    if (isFreehandMode) {
      freehandPointsRef.current = [clamped.x, clamped.y]
      onActiveStrokeChange?.(buildActiveStroke())
    }

    setDrawing({ startPoint: clamped, currentPoint: clamped })
  }, [screenToImage, tool, imageWidth, imageHeight, isFreehandMode, buildActiveStroke, onActiveStrokeChange])

  const handleMouseMove = useCallback((e: { evt: MouseEvent }) => {
    const pos = screenToImage(e.evt.offsetX, e.evt.offsetY)

    // 始终跟踪鼠标位置（画笔光标）
    if (isFreehandMode) {
      setMousePos(clampPoint(pos, imageWidth, imageHeight))
    }

    if (!drawingRef.current) return

    const { startPoint } = drawingRef.current

    if (isFreehandMode) {
      const clamped = clampPoint(pos, imageWidth, imageHeight)
      freehandPointsRef.current.push(clamped.x, clamped.y)
      onActiveStrokeChange?.(buildActiveStroke())
      setDrawing({ startPoint, currentPoint: clamped })
      return
    }

    let currentPoint: Point
    if (tool === ToolMode.SELECT) {
      currentPoint = pos
    } else if (tool === ToolMode.DRAW_CIRCLE) {
      currentPoint = clampCircleEndPoint(startPoint, pos, imageWidth, imageHeight)
    } else {
      currentPoint = clampPoint(pos, imageWidth, imageHeight)
    }

    setDrawing({ startPoint, currentPoint })
  }, [screenToImage, tool, imageWidth, imageHeight, isFreehandMode, buildActiveStroke, onActiveStrokeChange])

  const finishDrawing = useCallback((drawState: DrawingState) => {
    if (isFreehandMode) {
      const points = freehandPointsRef.current
      if (points.length >= 2) {
        const strokeType = getFreehandStrokeType(tool)
        const strokeColor = tool === ToolMode.BRUSH_DRAW ? color : undefined
        onFreehandStroke?.(strokeType, points, strokeColor)
      }
      freehandPointsRef.current = []
      onActiveStrokeChange?.(null)
      setDrawing(null)
      return
    }

    const { startPoint, currentPoint } = drawState

    if (tool === ToolMode.DRAW_RECT && !isInsideImage(currentPoint, imageWidth, imageHeight)) {
      setDrawing(null)
      return
    }
    if (tool === ToolMode.DRAW_CIRCLE) {
      const dx = currentPoint.x - startPoint.x
      const dy = currentPoint.y - startPoint.y
      const radius = Math.sqrt(dx * dx + dy * dy)
      const maxRadius = Math.min(startPoint.x, startPoint.y, imageWidth - startPoint.x, imageHeight - startPoint.y)
      if (radius > maxRadius || !isInsideImage(startPoint, imageWidth, imageHeight)) {
        setDrawing(null)
        return
      }
    }

    if (tool === ToolMode.DRAW_RECT) {
      const width = Math.abs(currentPoint.x - startPoint.x)
      const height = Math.abs(currentPoint.y - startPoint.y)
      if (width > 2 && height > 2) {
        onAddShape({
          id: generateId(),
          type: 'rect',
          startPoint,
          endPoint: currentPoint,
          color,
          strokeWidth,
        })
      }
    } else if (tool === ToolMode.DRAW_CIRCLE) {
      const dx = currentPoint.x - startPoint.x
      const dy = currentPoint.y - startPoint.y
      const radius = Math.sqrt(dx * dx + dy * dy)
      if (radius > 2) {
        onAddShape({
          id: generateId(),
          type: 'circle',
          startPoint,
          endPoint: currentPoint,
          color,
          strokeWidth,
        })
      }
    } else if (tool === ToolMode.SELECT) {
      const x = Math.min(startPoint.x, currentPoint.x)
      const y = Math.min(startPoint.y, currentPoint.y)
      const w = Math.abs(currentPoint.x - startPoint.x)
      const h = Math.abs(currentPoint.y - startPoint.y)
      onSelectByBox({ x, y, width: w, height: h })
    }

    setDrawing(null)
  }, [tool, color, strokeWidth, imageWidth, imageHeight, onAddShape, onSelectByBox, isFreehandMode, onFreehandStroke, onActiveStrokeChange])

  const handleMouseUp = useCallback(() => {
    const current = drawingRef.current
    if (!current) return
    finishDrawing(current)
  }, [finishDrawing])

  // window 级别监听 mouseup，防止鼠标移出画布后松开导致绘制卡住
  useEffect(() => {
    if (!drawing) return

    const handleWindowMouseUp = () => {
      const current = drawingRef.current
      if (current) {
        finishDrawing(current)
      }
    }
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => window.removeEventListener('mouseup', handleWindowMouseUp)
  }, [drawing, finishDrawing])

  const handleMouseLeave = useCallback(() => {
    setMousePos(null)
  }, [])

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
      {drawing && renderPreview(drawing, tool, color, strokeWidth)}
      {/* 自由绘制模式下的画笔光标圆圈 */}
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
  )
}

/** 仅渲染形状绘制预览（矩形/圆形/框选），自由绘制由 DrawingLayer 实时渲染 */
function renderPreview(
  drawing: DrawingState,
  tool: ToolMode,
  color: string,
  strokeWidth: number,
): React.ReactNode {
  const { startPoint, currentPoint } = drawing

  if (tool === ToolMode.DRAW_RECT) {
    const x = Math.min(startPoint.x, currentPoint.x)
    const y = Math.min(startPoint.y, currentPoint.y)
    const width = Math.abs(currentPoint.x - startPoint.x)
    const height = Math.abs(currentPoint.y - startPoint.y)
    return (
      <Rect
        x={x} y={y} width={width} height={height}
        stroke={color} strokeWidth={strokeWidth} dash={[6, 3]} listening={false}
      />
    )
  }

  if (tool === ToolMode.SELECT) {
    const x = Math.min(startPoint.x, currentPoint.x)
    const y = Math.min(startPoint.y, currentPoint.y)
    const width = Math.abs(currentPoint.x - startPoint.x)
    const height = Math.abs(currentPoint.y - startPoint.y)
    return (
      <Rect
        x={x} y={y} width={width} height={height}
        stroke="#1890ff" strokeWidth={strokeWidth} dash={[6, 3]}
        fill="rgba(24,144,255,0.1)" listening={false}
      />
    )
  }

  if (tool === ToolMode.DRAW_CIRCLE) {
    const dx = currentPoint.x - startPoint.x
    const dy = currentPoint.y - startPoint.y
    const radius = Math.sqrt(dx * dx + dy * dy)
    return (
      <KonvaCircle
        x={startPoint.x} y={startPoint.y} radius={radius}
        stroke={color} strokeWidth={strokeWidth} dash={[6, 3]} listening={false}
      />
    )
  }

  return null
}

export { InteractionLayer }
