import React, { useState, useCallback, useEffect } from 'react'
import { Layer, Rect, Circle as KonvaCircle } from 'react-konva'
import type { AnnotationData, Point } from '../../types/annotation'
import { ToolMode } from '../../core/tools/ToolController'

interface InteractionLayerProps {
  tool: ToolMode
  stageWidth: number
  stageHeight: number
  color: string
  strokeWidth: number
  screenToImage: (x: number, y: number) => Point
  onAddShape: (data: AnnotationData) => void
  onSelectByBox: (box: { x: number; y: number; width: number; height: number }) => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  onUndo: () => void
  onRedo: () => void
}

interface DrawingState {
  startPoint: Point
  currentPoint: Point
}

let idCounter = 0
function generateId(): string {
  return `annotation_${Date.now()}_${++idCounter}`
}

function InteractionLayer({
  tool, stageWidth, stageHeight, color, strokeWidth,
  screenToImage, onAddShape, onSelectByBox, onClearSelection,
  onDeleteSelected, onUndo, onRedo,
}: InteractionLayerProps) {
  const [drawing, setDrawing] = useState<DrawingState | null>(null)

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
    if (tool === ToolMode.SELECT) return

    const pos = screenToImage(e.evt.offsetX, e.evt.offsetY)
    setDrawing({ startPoint: pos, currentPoint: pos })
  }, [tool, screenToImage])

  const handleMouseMove = useCallback((e: { evt: MouseEvent }) => {
    if (!drawing) return

    const pos = screenToImage(e.evt.offsetX, e.evt.offsetY)
    setDrawing({ ...drawing, currentPoint: pos })
  }, [drawing, screenToImage])

  const handleMouseUp = useCallback(() => {
    if (!drawing) return

    const { startPoint, currentPoint } = drawing

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
    } else if (tool === ToolMode.BOX_SELECT) {
      const x = Math.min(startPoint.x, currentPoint.x)
      const y = Math.min(startPoint.y, currentPoint.y)
      const w = Math.abs(currentPoint.x - startPoint.x)
      const h = Math.abs(currentPoint.y - startPoint.y)
      onSelectByBox({ x, y, width: w, height: h })
    }

    setDrawing(null)
  }, [drawing, tool, color, strokeWidth, onAddShape, onSelectByBox])

  const handleStageClick = useCallback(() => {
    if (tool === ToolMode.SELECT) {
      onClearSelection()
    }
  }, [tool, onClearSelection])

  return (
    <Layer>
      {/* 透明交互区域 */}
      <Rect
        width={stageWidth}
        height={stageHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
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

  if (tool === ToolMode.DRAW_RECT || tool === ToolMode.BOX_SELECT) {
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
        stroke={tool === ToolMode.BOX_SELECT ? '#1890ff' : color}
        strokeWidth={strokeWidth}
        dash={[6, 3]}
        fill={tool === ToolMode.BOX_SELECT ? 'rgba(24,144,255,0.1)' : undefined}
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
      />
    )
  }

  return null
}

export { InteractionLayer }
