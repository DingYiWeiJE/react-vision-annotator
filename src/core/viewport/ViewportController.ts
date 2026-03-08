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

  /** 以屏幕坐标 (sx, sy) 为中心缩放，缩放后该点对应的图像位置不变 */
  zoomAt(factor: number, sx: number, sy: number): void {
    const oldScale = this._state.scale
    const newScale = Math.min(Math.max(oldScale * factor, this.MIN_SCALE), this.MAX_SCALE)
    // Konva 变换：screenPos = (imagePos + offsetX) * scale
    // imagePos = screenPos / scale - offsetX（缩放前后保持不变）
    // newOffsetX = screenPos / newScale - imagePos = screenPos / newScale - screenPos / oldScale + oldOffsetX
    this._state.offsetX += sx / newScale - sx / oldScale
    this._state.offsetY += sy / newScale - sy / oldScale
    this._state.scale = newScale
    this.notify()
  }

  rotate(deg: number): void {
    this._state.rotation = (this._state.rotation + deg) % 360
    this.notify()
  }

  /** 以屏幕坐标 (cx, cy) 为轴旋转，旋转后该屏幕点对应的图像位置不变 */
  rotateAt(deg: number, cx: number, cy: number): void {
    const oldRad = (this._state.rotation * Math.PI) / 180
    const newRad = ((this._state.rotation + deg) * Math.PI) / 180
    const s = this._state.scale

    // R(-r) * (cx, cy) = (cx*cos(r) + cy*sin(r), -cx*sin(r) + cy*cos(r))
    const oldX = cx * Math.cos(oldRad) + cy * Math.sin(oldRad)
    const oldY = -cx * Math.sin(oldRad) + cy * Math.cos(oldRad)
    const newX = cx * Math.cos(newRad) + cy * Math.sin(newRad)
    const newY = -cx * Math.sin(newRad) + cy * Math.cos(newRad)

    this._state.offsetX += (newX - oldX) / s
    this._state.offsetY += (newY - oldY) / s
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
      x: screenX / this._state.scale - this._state.offsetX,
      y: screenY / this._state.scale - this._state.offsetY,
    }
  }

  private notify(): void {
    this.onChange?.({ ...this._state })
  }
}
