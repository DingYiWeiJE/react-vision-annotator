import type { AnnotationData, BoundingBox } from '../../types/annotation'
import { BaseShape } from './BaseShape'

export class CircleShape extends BaseShape {
  get cx(): number { return this._startPoint.x }
  get cy(): number { return this._startPoint.y }
  get radius(): number {
    const dx = this._endPoint.x - this._startPoint.x
    const dy = this._endPoint.y - this._startPoint.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  move(dx: number, dy: number): void {
    this._startPoint = { x: this._startPoint.x + dx, y: this._startPoint.y + dy }
    this._endPoint = { x: this._endPoint.x + dx, y: this._endPoint.y + dy }
  }

  contains(x: number, y: number): boolean {
    const dx = x - this.cx
    const dy = y - this.cy
    return Math.sqrt(dx * dx + dy * dy) <= this.radius
  }

  getBounds(): BoundingBox {
    const r = this.radius
    return { x: this.cx - r, y: this.cy - r, width: r * 2, height: r * 2 }
  }

  toJSON(): AnnotationData {
    return {
      id: this.id,
      type: 'circle',
      startPoint: { ...this._startPoint },
      endPoint: { ...this._endPoint },
      label: this.label,
      color: this.color,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
    }
  }
}
