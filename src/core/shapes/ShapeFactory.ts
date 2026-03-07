import type { AnnotationData } from '../../types/annotation'
import { BaseShape } from './BaseShape'
import { RectShape } from './RectShape'
import { CircleShape } from './CircleShape'

export class ShapeFactory {
  static create(data: AnnotationData): BaseShape {
    switch (data.type) {
      case 'rect':   return new RectShape(data)
      case 'circle': return new CircleShape(data)
      default:       throw new Error(`Unknown shape type: ${(data as AnnotationData).type}`)
    }
  }
}
