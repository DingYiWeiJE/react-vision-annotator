import type { AnnotationData, BoundingBox } from '../../types/annotation'
import { BaseShape } from './BaseShape'

export class RectShape extends BaseShape {
  get x(): number { return Math.min(this._startPoint.x, this._endPoint.x) }
  get y(): number { return Math.min(this._startPoint.y, this._endPoint.y) }
  get width(): number { return Math.abs(this._endPoint.x - this._startPoint.x) }
  get height(): number { return Math.abs(this._endPoint.y - this._startPoint.y) }

  move(dx: number, dy: number): void {
    this._startPoint = { x: this._startPoint.x + dx, y: this._startPoint.y + dy }
    this._endPoint = { x: this._endPoint.x + dx, y: this._endPoint.y + dy }
  }

  contains(x: number, y: number): boolean {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  getBounds(): BoundingBox {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }

  toJSON(): AnnotationData {
    return {
      id: this.id,
      type: 'rect',
      startPoint: { ...this._startPoint },
      endPoint: { ...this._endPoint },
      label: this.label,
      color: this.color,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
    }
  }
}
