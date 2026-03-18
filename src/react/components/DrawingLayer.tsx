import React, { useLayoutEffect, useRef, useMemo } from 'react'
import { Image as KonvaImage } from 'react-konva'
import type Konva from 'konva'
import type { DrawingStroke } from '../../types/annotation'

interface DrawingLayerProps {
  image: HTMLImageElement | null
  strokes: DrawingStroke[]
  mosaicPixelSize: number
  activeStroke?: DrawingStroke | null
}

function drawStrokePath(
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  compositeOp: GlobalCompositeOperation,
  style: string,
): void {
  if (stroke.points.length < 2) return

  ctx.globalCompositeOperation = compositeOp
  ctx.fillStyle = style

  if (stroke.fillShape === 'rect') {
    const [x1, y1, x2, y2] = stroke.points
    ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
    return
  }

  if (stroke.fillShape === 'circle') {
    const [cx, cy, ex, ey] = stroke.points
    const radius = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.lineWidth = stroke.brushSize
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = style

  if (stroke.points.length === 2) {
    ctx.beginPath()
    ctx.arc(stroke.points[0], stroke.points[1], stroke.brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.moveTo(stroke.points[0], stroke.points[1])
  for (let i = 2; i < stroke.points.length; i += 2) {
    ctx.lineTo(stroke.points[i], stroke.points[i + 1])
  }
  ctx.stroke()
}

/** 预计算完全像素化的图片（缩小再放大，GPU 加速） */
function buildPixelatedCanvas(image: HTMLImageElement, pixelSize: number): HTMLCanvasElement {
  const w = image.naturalWidth
  const h = image.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const sw = Math.ceil(w / pixelSize)
  const sh = Math.ceil(h / pixelSize)
  const small = document.createElement('canvas')
  small.width = sw
  small.height = sh
  small.getContext('2d')!.drawImage(image, 0, 0, sw, sh)

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, w, h)
  return canvas
}

/** 同步合成：原图 + 马赛克（通过 mask 裁切预像素化图） + 画笔 */
function renderComposite(
  target: HTMLCanvasElement,
  image: HTMLImageElement,
  pixelated: HTMLCanvasElement,
  allStrokes: DrawingStroke[],
): void {
  const w = image.naturalWidth
  const h = image.naturalHeight
  if (target.width !== w) target.width = w
  if (target.height !== h) target.height = h
  const ctx = target.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(image, 0, 0)

  // 马赛克：mask → 裁切预像素化图叠到原图上
  if (allStrokes.some(s => s.type === 'mosaic')) {
    const mask = document.createElement('canvas')
    mask.width = w; mask.height = h
    const mctx = mask.getContext('2d')!
    for (const s of allStrokes) {
      if (s.type === 'mosaic') drawStrokePath(mctx, s, 'source-over', 'white')
      else if (s.type === 'erase') drawStrokePath(mctx, s, 'destination-out', 'white')
    }
    const temp = document.createElement('canvas')
    temp.width = w; temp.height = h
    const tctx = temp.getContext('2d')!
    tctx.drawImage(pixelated, 0, 0)
    tctx.globalCompositeOperation = 'destination-in'
    tctx.drawImage(mask, 0, 0)
    ctx.drawImage(temp, 0, 0)
  }

  // 画笔
  if (allStrokes.some(s => s.type === 'brush')) {
    const brush = document.createElement('canvas')
    brush.width = w; brush.height = h
    const bctx = brush.getContext('2d')!
    for (const s of allStrokes) {
      if (s.type === 'brush') drawStrokePath(bctx, s, 'source-over', s.color ?? '#000000')
      else if (s.type === 'erase') drawStrokePath(bctx, s, 'destination-out', 'white')
    }
    ctx.drawImage(brush, 0, 0)
  }
}

function DrawingLayer({ image, strokes, mosaicPixelSize, activeStroke }: DrawingLayerProps) {
  const canvasRef = useRef(document.createElement('canvas'))
  const konvaRef = useRef<Konva.Image>(null)

  const pixelated = useMemo(() => {
    if (!image) return null
    return buildPixelatedCanvas(image, mosaicPixelSize)
  }, [image, mosaicPixelSize])

  const allStrokes = useMemo(() => {
    return activeStroke ? [...strokes, activeStroke] : strokes
  }, [strokes, activeStroke])

  const hasContent = allStrokes.length > 0

  useLayoutEffect(() => {
    if (!image || !pixelated || !hasContent) {
      canvasRef.current.width = 0
      canvasRef.current.height = 0
      konvaRef.current?.getLayer()?.batchDraw()
      return
    }
    performance.mark('renderComposite:start')
    renderComposite(canvasRef.current, image, pixelated, allStrokes)
    performance.mark('renderComposite:end')
    performance.measure('renderComposite', 'renderComposite:start', 'renderComposite:end')
    konvaRef.current?.getLayer()?.batchDraw()
  }, [image, pixelated, allStrokes, hasContent])

  if (!image || !hasContent) return null

  return <KonvaImage ref={konvaRef} image={canvasRef.current} listening={false} />
}

/** 导出用：生成带绘图的合成图片 canvas */
function buildCompositeForExport(
  image: HTMLImageElement,
  strokes: DrawingStroke[],
  mosaicPixelSize: number,
): HTMLCanvasElement {
  const pixelated = buildPixelatedCanvas(image, mosaicPixelSize)
  const result = document.createElement('canvas')
  renderComposite(result, image, pixelated, strokes)
  return result
}

export { DrawingLayer, buildCompositeForExport }
