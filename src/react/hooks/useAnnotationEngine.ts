import { useRef, useState, useEffect, useCallback } from 'react'
import type { AnnotationData, ViewportState } from '../../types/annotation'
import { AnnotationManager } from '../../core/annotation/AnnotationManager'
import { SelectionManager } from '../../core/selection/SelectionManager'
import { ToolController, ToolMode } from '../../core/tools/ToolController'
import { HistoryManager } from '../../core/history/HistoryManager'
import { ViewportController } from '../../core/viewport/ViewportController'
import { ShapeFactory } from '../../core/shapes/ShapeFactory'

interface AnnotationEngine {
  shapes: AnnotationData[]
  viewport: ViewportState
  tool: ToolMode
  annotationManager: AnnotationManager
  selectionManager: SelectionManager
  toolController: ToolController
  historyManager: HistoryManager
  viewportController: ViewportController
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
}

export function useAnnotationEngine(initialAnnotations?: AnnotationData[]): AnnotationEngine {
  const annotationManager = useRef(new AnnotationManager()).current
  const selectionManager = useRef(new SelectionManager(annotationManager)).current
  const toolController = useRef(new ToolController()).current
  const historyManager = useRef(new HistoryManager()).current
  const viewportController = useRef(new ViewportController()).current

  const [shapes, setShapes] = useState<AnnotationData[]>(initialAnnotations ?? [])
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1, rotation: 0, offsetX: 0, offsetY: 0,
  })
  const [tool, setToolState] = useState<ToolMode>(ToolMode.SELECT)

  useEffect(() => {
    annotationManager.setHistoryManager(historyManager)
    annotationManager.subscribe((updated) => {
      setShapes(updated.map(s => s.toJSON()))
    })
    viewportController.subscribe((state) => {
      setViewport(state)
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
  }, [])

  const removeShape = useCallback((id: string) => {
    annotationManager.remove(id)
  }, [])

  const updateShape = useCallback((data: AnnotationData) => {
    annotationManager.update(ShapeFactory.create(data))
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
    const currentSnapshot = annotationManager.export()
    const snapshot = historyManager.undo()
    if (snapshot) {
      historyManager.pushToFuture(currentSnapshot)
      annotationManager.load(snapshot)
    }
  }, [])

  const redo = useCallback(() => {
    const currentSnapshot = annotationManager.export()
    const snapshot = historyManager.redo()
    if (snapshot) {
      historyManager.push(currentSnapshot)
      annotationManager.load(snapshot)
    }
  }, [])

  const load = useCallback((annotations: AnnotationData[]) => {
    annotationManager.load(annotations)
  }, [])

  const exportJSON = useCallback((): AnnotationData[] => {
    return annotationManager.export()
  }, [])

  return {
    shapes,
    viewport,
    tool,
    annotationManager,
    selectionManager,
    toolController,
    historyManager,
    viewportController,
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
  }
}
