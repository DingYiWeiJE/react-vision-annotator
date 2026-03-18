import { useRef, useState, useEffect, useCallback } from 'react'
import type { AnnotationData, ViewportState, DrawingData } from '../../types/annotation'
import { AnnotationManager } from '../../core/annotation/AnnotationManager'
import { SelectionManager } from '../../core/selection/SelectionManager'
import { ToolController, ToolMode } from '../../core/tools/ToolController'
import { HistoryManager } from '../../core/history/HistoryManager'
import { ViewportController } from '../../core/viewport/ViewportController'
import { ShapeFactory } from '../../core/shapes/ShapeFactory'
import { DrawingManager } from '../../core/drawing/DrawingManager'

interface AnnotationEngine {
  shapes: AnnotationData[]
  selectedIds: string[]
  viewport: ViewportState
  tool: ToolMode
  drawingData: DrawingData
  annotationManager: AnnotationManager
  selectionManager: SelectionManager
  toolController: ToolController
  historyManager: HistoryManager
  viewportController: ViewportController
  drawingManager: DrawingManager
  setTool: (mode: ToolMode) => void
  addShape: (data: AnnotationData) => void
  removeShape: (id: string) => void
  updateShape: (data: AnnotationData) => void
  selectByBox: (box: { x: number; y: number; width: number; height: number }) => void
  clearSelection: () => void
  getSelected: () => AnnotationData[]
  zoomIn: () => void
  zoomOut: () => void
  rotate: (deg: number) => void
  reset: () => void
  undo: () => void
  redo: () => void
  load: (annotations: AnnotationData[]) => void
  exportJSON: () => AnnotationData[]
  addDrawingStroke: (type: 'mosaic' | 'brush' | 'erase', points: number[], brushSize: number, color?: string, fillShape?: 'rect' | 'circle') => void
  loadDrawing: (data: DrawingData) => void
  exportDrawing: () => DrawingData
  clearDrawing: () => void
}

export function useAnnotationEngine(initialAnnotations?: AnnotationData[]): AnnotationEngine {
  const annotationManager = useRef(new AnnotationManager()).current
  const selectionManager = useRef(new SelectionManager(annotationManager)).current
  const toolController = useRef(new ToolController()).current
  const historyManager = useRef(new HistoryManager()).current
  const viewportController = useRef(new ViewportController()).current
  const drawingManager = useRef(new DrawingManager()).current
  // 操作来源日志：追踪最近操作的是标注还是绘图，用于统一 undo/redo
  const actionLogRef = useRef<('annotation' | 'drawing')[]>([])

  const [shapes, setShapes] = useState<AnnotationData[]>(initialAnnotations ?? [])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1, rotation: 0, offsetX: 0, offsetY: 0,
  })
  const [tool, setToolState] = useState<ToolMode>(ToolMode.SELECT)
  const [drawingData, setDrawingData] = useState<DrawingData>({ strokes: [], mosaicPixelSize: 10 })

  useEffect(() => {
    annotationManager.setHistoryManager(historyManager)
    annotationManager.subscribe((updated) => {
      setShapes(updated.map(s => s.toJSON()))
    })
    viewportController.subscribe((state) => {
      setViewport(state)
    })
    selectionManager.subscribe((ids) => {
      setSelectedIds(ids)
    })
    drawingManager.subscribe((data) => {
      setDrawingData(data)
    })
    if (initialAnnotations?.length) {
      annotationManager.load(initialAnnotations)
    }
  }, [])

  const setTool = useCallback((mode: ToolMode) => {
    toolController.setMode(mode)
    setToolState(mode)
  }, [])

  const addShape = useCallback((data: AnnotationData) => {
    annotationManager.add(ShapeFactory.create(data))
    actionLogRef.current.push('annotation')
  }, [])

  const removeShape = useCallback((id: string) => {
    annotationManager.remove(id)
    actionLogRef.current.push('annotation')
  }, [])

  const updateShape = useCallback((data: AnnotationData) => {
    annotationManager.update(ShapeFactory.create(data))
    actionLogRef.current.push('annotation')
  }, [])

  const selectByBox = useCallback((box: { x: number; y: number; width: number; height: number }) => {
    selectionManager.selectByBox(box)
  }, [])

  const clearSelection = useCallback(() => {
    selectionManager.clear()
  }, [])

  const getSelected = useCallback((): AnnotationData[] => {
    return selectionManager.getSelected().map(s => s.toJSON())
  }, [])

  const zoomIn = useCallback(() => viewportController.zoomIn(), [])
  const zoomOut = useCallback(() => viewportController.zoomOut(), [])
  const rotate = useCallback((deg: number) => viewportController.rotate(deg), [])
  const reset = useCallback(() => viewportController.reset(), [])

  const undo = useCallback(() => {
    const lastSource = actionLogRef.current[actionLogRef.current.length - 1]
    if (lastSource === 'drawing' && drawingManager.canUndo()) {
      drawingManager.undo()
      actionLogRef.current.pop()
    } else if (lastSource === 'annotation') {
      const currentSnapshot = annotationManager.export()
      const snapshot = historyManager.undo()
      if (snapshot) {
        historyManager.pushToFuture(currentSnapshot)
        annotationManager.load(snapshot)
        actionLogRef.current.pop()
      }
    } else if (drawingManager.canUndo()) {
      drawingManager.undo()
    } else {
      const currentSnapshot = annotationManager.export()
      const snapshot = historyManager.undo()
      if (snapshot) {
        historyManager.pushToFuture(currentSnapshot)
        annotationManager.load(snapshot)
      }
    }
  }, [])

  const redo = useCallback(() => {
    // redo 按反向顺序恢复：优先检查绘图，再检查标注
    if (drawingManager.canRedo()) {
      drawingManager.redo()
      actionLogRef.current.push('drawing')
    } else {
      const currentSnapshot = annotationManager.export()
      const snapshot = historyManager.redo()
      if (snapshot) {
        historyManager.push(currentSnapshot)
        annotationManager.load(snapshot)
        actionLogRef.current.push('annotation')
      }
    }
  }, [])

  const load = useCallback((annotations: AnnotationData[]) => {
    annotationManager.load(annotations)
  }, [])

  const exportJSON = useCallback((): AnnotationData[] => {
    return annotationManager.export()
  }, [])

  const addDrawingStroke = useCallback((type: 'mosaic' | 'brush' | 'erase', points: number[], brushSize: number, color?: string, fillShape?: 'rect' | 'circle') => {
    drawingManager.addStroke(type, points, brushSize, color, fillShape)
    actionLogRef.current.push('drawing')
  }, [])

  const loadDrawing = useCallback((data: DrawingData) => {
    drawingManager.load(data)
  }, [])

  const exportDrawing = useCallback((): DrawingData => {
    return drawingManager.export()
  }, [])

  const clearDrawing = useCallback(() => {
    drawingManager.clear()
    actionLogRef.current.push('drawing')
  }, [])

  return {
    shapes,
    selectedIds,
    viewport,
    tool,
    drawingData,
    annotationManager,
    selectionManager,
    toolController,
    historyManager,
    viewportController,
    drawingManager,
    setTool,
    addShape,
    removeShape,
    updateShape,
    selectByBox,
    clearSelection,
    getSelected,
    zoomIn,
    zoomOut,
    rotate,
    reset,
    undo,
    redo,
    load,
    exportJSON,
    addDrawingStroke,
    loadDrawing,
    exportDrawing,
    clearDrawing,
  }
}
