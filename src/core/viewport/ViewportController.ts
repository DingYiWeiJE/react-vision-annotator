import type { Point, ViewportState } from '../../types/annotation'

export class ViewportController {
  private readonly MIN_SCALE = 0.1
  private readonly MAX_SCALE = 10
  private readonly ZOOM_STEP = 0.1

  private _state: ViewportState = {
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
  }

  private onChange?: (state: ViewportState) => void

  subscribe(cb: (state: ViewportState) => void): void {
    this.onChange = cb
  }

  getState(): ViewportState {
    return { ...this._state }
  }

  zoomIn(): void {
    this._state.scale = Math.min(this._state.scale + this.ZOOM_STEP, this.MAX_SCALE)
    this.notify()
  }

  zoomOut(): void {
    this._state.scale = Math.max(this._state.scale - this.ZOOM_STEP, this.MIN_SCALE)
    this.notify()
  }

  zoomBy(factor: number): void {
    this._state.scale = Math.min(Math.max(this._state.scale * factor, this.MIN_SCALE), this.MAX_SCALE)
    this.notify()
  }

  rotate(deg: number): void {
    this._state.rotation = (this._state.rotation + deg) % 360
    this.notify()
  }

  pan(dx: number, dy: number): void {
    this._state.offsetX += dx
    this._state.offsetY += dy
    this.notify()
  }

  reset(): void {
    this._state = { scale: 1, rotation: 0, offsetX: 0, offsetY: 0 }
    this.notify()
  }

  screenToImage(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this._state.offsetX) / this._state.scale,
      y: (screenY - this._state.offsetY) / this._state.scale,
    }
  }

  private notify(): void {
    this.onChange?.({ ...this._state })
  }
}
