import type { AnnotationData } from '../../types/annotation'
import { BaseShape } from '../shapes/BaseShape'
import { ShapeFactory } from '../shapes/ShapeFactory'
import type { HistoryManager } from '../history/HistoryManager'

export class AnnotationManager {
  private shapes: BaseShape[] = []
  private onChange?: (shapes: BaseShape[]) => void
  private historyManager?: HistoryManager

  setHistoryManager(historyManager: HistoryManager): void {
    this.historyManager = historyManager
  }

  subscribe(cb: (shapes: BaseShape[]) => void): void {
    this.onChange = cb
  }

  add(shape: BaseShape): void {
    this.pushSnapshot()
    this.shapes.push(shape)
    this.notify()
  }

  remove(id: string): void {
    this.pushSnapshot()
    this.shapes = this.shapes.filter(s => s.id !== id)
    this.notify()
  }

  update(shape: BaseShape): void {
    this.pushSnapshot()
    const index = this.shapes.findIndex(s => s.id === shape.id)
    if (index !== -1) {
      this.shapes[index] = shape
    }
    this.notify()
  }

  getAll(): BaseShape[] {
    return this.shapes
  }

  getById(id: string): BaseShape | undefined {
    return this.shapes.find(s => s.id === id)
  }

  load(json: AnnotationData[]): void {
    this.shapes = json.map(data => ShapeFactory.create(data))
    this.notify()
  }

  export(): AnnotationData[] {
    return this.shapes.map(s => s.toJSON())
  }

  private pushSnapshot(): void {
    this.historyManager?.push(this.export())
  }

  private notify(): void {
    this.onChange?.(this.shapes)
  }
}
