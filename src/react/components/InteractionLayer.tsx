import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Layer, Rect, Circle as KonvaCircle } from 'react-konva'
import type { AnnotationData, Point } from '../../types/annotation'
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

  // 保持方向不变，缩短到 maxRadius
  const ratio = maxRadius / rawRadius
  return { x: center.x + dx * ratio, y: center.y + dy * ratio }
}

function isInsideImage(p: Point, w: number, h: number): boolean {
  return p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h
}

function InteractionLayer({
  tool, stageWidth, stageHeight, imageWidth, imageHeight, color, strokeWidth,
  screenToImage, onAddShape, onSelectByBox, onClearSelection,
  onDeleteSelected, onUndo, onRedo, onDrawingChange,
}: InteractionLayerProps) {
  const [drawing, setDrawing] = useState<DrawingState | null>(null)
  const drawingRef = useRef<DrawingState | null>(null)

  // 同步 ref，让 window 级别的事件回调能拿到最新的 drawing
  useEffect(() => {
    drawingRef.current = drawing
    onDrawingChange?.(drawing !== null)
  }, [drawing])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteSelected()
      } else if (e.key === 'Escape') {
        setDrawing(null)
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
  }, [onDeleteSelected, onClearSelection, onUndo, onRedo])

  const handleMouseDown = useCallback((e: { evt: MouseEvent }) => {
    if (e.evt.button !== 0) return

    // SELECT 模式：仅 Ctrl+拖拽 触发框选，普通拖拽由 Stage 容器处理平移
    if (tool === ToolMode.SELECT && !(e.evt.ctrlKey || e.evt.metaKey)) return

    const pos = screenToImage(e.evt.offsetX, e.evt.offsetY)

    // DRAW 模式下，起点必须在图片范围内
    if (tool !== ToolMode.SELECT && !isInsideImage(pos, imageWidth, imageHeight)) return

    const clamped = clampPoint(pos, imageWidth, imageHeight)
    setDrawing({ startPoint: clamped, currentPoint: clamped })
  }, [screenToImage, tool, imageWidth, imageHeight])

  const handleMouseMove = useCallback((e: { evt: MouseEvent }) => {
    if (!drawingRef.current) return

    const pos = screenToImage(e.evt.offsetX, e.evt.offsetY)
    const { startPoint } = drawingRef.current

    let currentPoint: Point
    if (tool === ToolMode.SELECT) {
      currentPoint = pos
    } else if (tool === ToolMode.DRAW_CIRCLE) {
      // 圆形：钳制半径使整个圆不超出图片
      currentPoint = clampCircleEndPoint(startPoint, pos, imageWidth, imageHeight)
    } else {
      currentPoint = clampPoint(pos, imageWidth, imageHeight)
    }

    setDrawing({ startPoint, currentPoint })
  }, [screenToImage, tool, imageWidth, imageHeight])

  const finishDrawing = useCallback((drawState: DrawingState) => {
    const { startPoint, currentPoint } = drawState

    // DRAW 模式下，终点在图片外则舍弃
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
  }, [tool, color, strokeWidth, imageWidth, imageHeight, onAddShape, onSelectByBox])

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

  return (
    <Layer>
      {/* 交互区域覆盖整个图片，而非画布显示区域 */}
      <Rect
        width={imageWidth || stageWidth}
        height={imageHeight || stageHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      {drawing && renderPreview(drawing, tool, color, strokeWidth)}
    </Layer>
  )
}

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
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={color}
        strokeWidth={strokeWidth}
        dash={[6, 3]}
        listening={false}
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
    )
  }

  if (tool === ToolMode.DRAW_CIRCLE) {
    const dx = currentPoint.x - startPoint.x
    const dy = currentPoint.y - startPoint.y
    const radius = Math.sqrt(dx * dx + dy * dy)
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
    )
  }

  return null
}

export { InteractionLayer }
