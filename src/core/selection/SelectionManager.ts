import type { BoundingBox } from '../../types/annotation'
import type { BaseShape } from '../shapes/BaseShape'
import type { AnnotationManager } from '../annotation/AnnotationManager'

type SelectionListener = (ids: string[]) => void

export class SelectionManager {
  private selectedIds: Set<string> = new Set()
  private annotationManager: AnnotationManager
  private listener: SelectionListener | null = null

  constructor(annotationManager: AnnotationManager) {
    this.annotationManager = annotationManager
  }

  subscribe(listener: SelectionListener): void {
    this.listener = listener
  }

  private notify(): void {
    this.listener?.([...this.selectedIds])
  }

  select(ids: string[]): void {
    this.clearSelectedState()
    this.selectedIds = new Set(ids)
    this.applySelectedState()
    this.notify()
  }

  clear(): void {
    this.clearSelectedState()
    this.selectedIds.clear()
    this.notify()
  }

  getSelected(): BaseShape[] {
    return this.annotationManager.getAll()
      .filter(s => this.selectedIds.has(s.id))
  }

  getSelectedIds(): string[] {
    return [...this.selectedIds]
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id)
  }

  selectByBox(box: BoundingBox): void {
    this.clearSelectedState()
    this.selectedIds.clear()

    for (const shape of this.annotationManager.getAll()) {
      if (this.isFullyContained(shape.getBounds(), box)) {
        this.selectedIds.add(shape.id)
      }
    }
    this.applySelectedState()
    this.notify()
  }

  private isFullyContained(shapeBounds: BoundingBox, box: BoundingBox): boolean {
    return shapeBounds.x >= box.x &&
           shapeBounds.y >= box.y &&
           shapeBounds.x + shapeBounds.width <= box.x + box.width &&
           shapeBounds.y + shapeBounds.height <= box.y + box.height
  }

  private clearSelectedState(): void {
    for (const shape of this.annotationManager.getAll()) {
      shape.selected = false
    }
  }

  private applySelectedState(): void {
    for (const shape of this.annotationManager.getAll()) {
      shape.selected = this.selectedIds.has(shape.id)
    }
  }
}
