export interface Point {
  x: number
  y: number
}

export interface AnnotationData {
  id: string
  type: 'rect' | 'circle'
  startPoint: Point
  endPoint: Point
  label?: string
  color: string
  strokeWidth: number
  visible?: boolean
}

export interface ViewportState {
  scale: number
  rotation: number
  offsetX: number
  offsetY: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DrawingStroke {
  id: string
  type: 'mosaic' | 'brush' | 'erase'
  /** 填充形状模式：points=[x1,y1,x2,y2]；未设置时为自由路径点列表 */
  fillShape?: 'rect' | 'circle'
  points: number[]
  brushSize: number
  color?: string
}

export interface DrawingData {
  strokes: DrawingStroke[]
  mosaicPixelSize: number
}
