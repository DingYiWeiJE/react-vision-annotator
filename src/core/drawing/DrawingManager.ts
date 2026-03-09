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
  private _past: DrawingStroke[][] = []
  private _future: DrawingStroke[][] = []
  private readonly MAX_HISTORY = 50

  get mosaicPixelSize(): number { return this._mosaicPixelSize }

  setMosaicPixelSize(size: number): void {
    this._mosaicPixelSize = Math.max(2, size)
    this.notify()
  }

  addStroke(type: 'mosaic' | 'brush' | 'erase', points: number[], brushSize: number, color?: string): void {
    this.pushHistory()
    this._future = []
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

  canUndo(): boolean {
    return this._past.length > 0
  }

  canRedo(): boolean {
    return this._future.length > 0
  }

  undo(): boolean {
    const snapshot = this._past.pop()
    if (!snapshot) return false
    this._future.push(this.cloneStrokes())
    this._strokes = snapshot
    this.notify()
    return true
  }

  redo(): boolean {
    const snapshot = this._future.pop()
    if (!snapshot) return false
    this._past.push(this.cloneStrokes())
    this._strokes = snapshot
    this.notify()
    return true
  }

  load(data: DrawingData): void {
    this._strokes = data.strokes.map(s => ({ ...s }))
    this._mosaicPixelSize = data.mosaicPixelSize
    this._past = []
    this._future = []
    this.notify()
  }

  export(): DrawingData {
    return {
      strokes: this._strokes.map(s => ({ ...s, points: [...s.points] })),
      mosaicPixelSize: this._mosaicPixelSize,
    }
  }

  clear(): void {
    if (this._strokes.length > 0) {
      this.pushHistory()
      this._future = []
    }
    this._strokes = []
    this.notify()
  }

  subscribe(fn: DrawingSubscriber): void {
    this._subscribers.push(fn)
  }

  private pushHistory(): void {
    this._past.push(this.cloneStrokes())
    if (this._past.length > this.MAX_HISTORY) {
      this._past.shift()
    }
  }

  private cloneStrokes(): DrawingStroke[] {
    return this._strokes.map(s => ({ ...s, points: [...s.points] }))
  }

  private notify(): void {
    const data = this.export()
    this._subscribers.forEach(fn => fn(data))
  }
}
