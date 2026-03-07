import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import type { AnnotationData, Point } from '../../types/annotation'
import { ToolMode } from '../../core/tools/ToolController'
import { useAnnotationEngine } from '../hooks/useAnnotationEngine'
import { ImageLayer } from './ImageLayer'
import { ShapeLayer } from './ShapeLayer'
import { InteractionLayer } from './InteractionLayer'

interface AnnotationCanvasProps {
  image: string
  annotations?: AnnotationData[]
  tool?: ToolMode
  strokeWidth?: number
  color?: string
  readOnly?: boolean
  width?: number
  height?: number
  onChange?: (annotations: AnnotationData[]) => void
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
      width = 800,
      height = 600,
      onChange,
    } = props

    const engine = useAnnotationEngine(annotations)
    const [stageSize, setStageSize] = useState({ width, height })

    const currentTool = readOnly ? ToolMode.SELECT : (externalTool ?? engine.tool)

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
      setStageSize({ width: width ?? imgWidth, height: height ?? imgHeight })
    }, [width, height])

    useImperativeHandle(ref, () => ({
      load: (data: AnnotationData[]) => {
        engine.load(data)
        onChange?.(data)
      },
      export: () => engine.exportJSON(),
      zoomIn: () => engine.zoomIn(),
      zoomOut: () => engine.zoomOut(),
      rotate: (deg: number) => engine.rotate(deg),
      reset: () => engine.reset(),
      clearSelection: () => engine.clearSelection(),
      deleteSelected: handleDeleteSelected,
    }), [engine, onChange, handleDeleteSelected])

    return (
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={engine.viewport.scale}
        scaleY={engine.viewport.scale}
        rotation={engine.viewport.rotation}
        offsetX={-engine.viewport.offsetX}
        offsetY={-engine.viewport.offsetY}
      >
        <Layer>
          <ImageLayer src={image} onLoad={handleImageLoad} />
        </Layer>
        <ShapeLayer
          shapes={engine.shapes}
          selectedIds={engine.selectionManager.getSelectedIds()}
          onSelect={handleSelect}
          onDragEnd={handleDragEnd}
          onResize={handleResize}
        />
        {!readOnly && (
          <InteractionLayer
            tool={currentTool}
            stageWidth={stageSize.width}
            stageHeight={stageSize.height}
            color={color}
            strokeWidth={strokeWidth}
            screenToImage={screenToImage}
            onAddShape={handleAddShape}
            onSelectByBox={engine.selectByBox}
            onClearSelection={engine.clearSelection}
            onDeleteSelected={handleDeleteSelected}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )}
      </Stage>
    )
  }
)

export { AnnotationCanvas }
export type { AnnotationCanvasRef }
