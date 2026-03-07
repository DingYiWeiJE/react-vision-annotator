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
