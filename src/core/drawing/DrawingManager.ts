import type { DrawingStroke, DrawingData } from '../../types/annotation'

type DrawingSubscriber = (data: DrawingData) => void

let strokeIdCounter = 0
function generateStrokeId(): string {
  return `drawing_${Date.now()}_${++strokeIdCounter}`
}

export class DrawingManager {
  private _strokes: DrawingStroke[] = []
  private _mosaicPixelSize = 10
  private _subscribers: DrawingSubscriber[] = []

  get mosaicPixelSize(): number { return this._mosaicPixelSize }

  setMosaicPixelSize(size: number): void {
    this._mosaicPixelSize = Math.max(2, size)
    this.notify()
  }

  addStroke(type: 'mosaic' | 'brush' | 'erase', points: number[], brushSize: number, color?: string): void {
    this._strokes.push({
      id: generateStrokeId(),
      type,
      points,
      brushSize,
      color,
    })
    this.notify()
  }

  hasStrokes(): boolean {
    return this._strokes.length > 0
  }

  load(data: DrawingData): void {
    this._strokes = data.strokes.map(s => ({ ...s }))
    this._mosaicPixelSize = data.mosaicPixelSize
    this.notify()
  }

  export(): DrawingData {
    return {
      strokes: this._strokes.map(s => ({ ...s, points: [...s.points] })),
      mosaicPixelSize: this._mosaicPixelSize,
    }
  }

  clear(): void {
    this._strokes = []
    this.notify()
  }

  subscribe(fn: DrawingSubscriber): void {
    this._subscribers.push(fn)
  }

  private notify(): void {
    const data = this.export()
    this._subscribers.forEach(fn => fn(data))
  }
}
