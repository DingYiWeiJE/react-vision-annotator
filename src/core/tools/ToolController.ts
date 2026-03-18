export enum ToolMode {
  SELECT = 'SELECT',
  DRAW_RECT = 'DRAW_RECT',
  DRAW_CIRCLE = 'DRAW_CIRCLE',
  MOSAIC_DRAW = 'MOSAIC_DRAW',
  BRUSH_DRAW = 'BRUSH_DRAW',
  ERASER = 'ERASER',
  BRUSH_FILL_RECT = 'BRUSH_FILL_RECT',
  BRUSH_FILL_CIRCLE = 'BRUSH_FILL_CIRCLE',
  MOSAIC_FILL_RECT = 'MOSAIC_FILL_RECT',
  MOSAIC_FILL_CIRCLE = 'MOSAIC_FILL_CIRCLE',
}

export class ToolController {
  private _mode: ToolMode = ToolMode.SELECT

  get mode(): ToolMode { return this._mode }

  setMode(mode: ToolMode): void {
    this._mode = mode
  }
}
