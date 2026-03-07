import type { AnnotationData } from '../../types/annotation'

export class HistoryManager {
  private past: AnnotationData[][] = []
  private future: AnnotationData[][] = []
  private readonly MAX_HISTORY = 50

  push(snapshot: AnnotationData[]): void {
    this.past.push(snapshot.map(s => ({ ...s, startPoint: { ...s.startPoint }, endPoint: { ...s.endPoint } })))
    if (this.past.length > this.MAX_HISTORY) {
      this.past.shift()
    }
    this.future = []
  }

  undo(): AnnotationData[] | null {
    const snapshot = this.past.pop()
    if (!snapshot) return null
    return snapshot
  }

  redo(): AnnotationData[] | null {
    const snapshot = this.future.pop()
    if (!snapshot) return null
    return snapshot
  }

  pushToFuture(snapshot: AnnotationData[]): void {
    this.future.push(snapshot.map(s => ({ ...s, startPoint: { ...s.startPoint }, endPoint: { ...s.endPoint } })))
  }

  clear(): void {
    this.past = []
    this.future = []
  }
}
