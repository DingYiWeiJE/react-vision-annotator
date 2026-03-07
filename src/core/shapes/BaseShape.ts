import type { Point, AnnotationData, BoundingBox } from '../../types/annotation'

export abstract class BaseShape {
  readonly id: string
  protected _startPoint: Point
  protected _endPoint: Point
  private _label: string | undefined
  private _color: string
  private _strokeWidth: number
  private _selected: boolean = false
  private _visible: boolean = true

  constructor(data: AnnotationData) {
    this.id = data.id
    this._startPoint = { ...data.startPoint }
    this._endPoint = { ...data.endPoint }
    this._label = data.label
    this._color = data.color
    this._strokeWidth = data.strokeWidth
    this._visible = data.visible ?? true
  }

  get startPoint(): Point { return this._startPoint }
  get endPoint(): Point { return this._endPoint }
  get label(): string | undefined { return this._label }
  get color(): string { return this._color }
  get strokeWidth(): number { return this._strokeWidth }
  get selected(): boolean { return this._selected }
  get visible(): boolean { return this._visible }

  set selected(value: boolean) { this._selected = value }
  set visible(value: boolean) { this._visible = value }
  set label(value: string | undefined) { this._label = value }
  set color(value: string) { this._color = value }
  set strokeWidth(value: number) { this._strokeWidth = value }

  abstract move(dx: number, dy: number): void
  abstract contains(x: number, y: number): boolean
  abstract getBounds(): BoundingBox
  abstract toJSON(): AnnotationData

  updatePoints(startPoint: Point, endPoint: Point): void {
    this._startPoint = { ...startPoint }
    this._endPoint = { ...endPoint }
  }
}
