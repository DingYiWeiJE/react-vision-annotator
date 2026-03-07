import React, { useState, useCallback } from 'react'
import { Circle as KonvaCircle, Group } from 'react-konva'
import type { AnnotationData, Point } from '../../types/annotation'
import { ToolMode } from '../../core/tools/ToolController'

interface CircleShapeViewProps {
  data: AnnotationData
  selected: boolean
  tool: ToolMode
  onSelect: (id: string) => void
  onDragEnd: (id: string, startPoint: Point, endPoint: Point) => void
  onResize: (id: string, startPoint: Point, endPoint: Point) => void
}

const HANDLE_SIZE = 8
const HANDLE_HIT_STROKE_WIDTH = 10

function CircleShapeView({ data, selected, tool, onSelect, onDragEnd, onResize }: CircleShapeViewProps) {
  const [hovered, setHovered] = useState(false)

  const isSelectTool = tool === ToolMode.SELECT

  const cx = data.startPoint.x
  const cy = data.startPoint.y
  const dx = data.endPoint.x - data.startPoint.x
  const dy = data.endPoint.y - data.startPoint.y
  const radius = Math.sqrt(dx * dx + dy * dy)

  const handleDragEnd = useCallback((e: { target: { x: () => number; y: () => number } }) => {
    const newCx = e.target.x()
    const newCy = e.target.y()
    const moveDx = newCx - cx
    const moveDy = newCy - cy
    onDragEnd(data.id, {
      x: data.startPoint.x + moveDx,
      y: data.startPoint.y + moveDy,
    }, {
      x: data.endPoint.x + moveDx,
      y: data.endPoint.y + moveDy,
    })
  }, [data, cx, cy, onDragEnd])

  const handleClick = useCallback(() => {
    onSelect(data.id)
  }, [data.id, onSelect])

  const handleMouseEnter = useCallback((e: { target: { getStage: () => { container: () => HTMLDivElement } | null } }) => {
    setHovered(true)
    if (isSelectTool) {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = 'grab'
      }
    }
  }, [isSelectTool])

  const handleMouseLeave = useCallback((e: { target: { getStage: () => { container: () => HTMLDivElement } | null } }) => {
    setHovered(false)
    if (isSelectTool) {
      const stage = e.target.getStage()
      if (stage) {
        stage.container().style.cursor = ''
      }
    }
  }, [isSelectTool])

  const handleHandleDrag = useCallback((handleIndex: number, e: { target: { x: (v?: number) => number; y: (v?: number) => number } }) => {
    const hx = e.target.x()
    const hy = e.target.y()

    // 计算新的半径：handle到圆心的距离
    const hdx = hx - cx
    const hdy = hy - cy
    const newRadius = Math.sqrt(hdx * hdx + hdy * hdy)

    // 保持圆心不变，更新 endPoint 使 radius 匹配
    onResize(data.id, data.startPoint, { x: cx + newRadius, y: cy })

    // 修复控制点脱离线框 bug：将控制点位置重置到计算后的圆周位置
    const handlePositions = [
      { x: cx, y: cy - newRadius },     // top
      { x: cx + newRadius, y: cy },     // right
      { x: cx, y: cy + newRadius },     // bottom
      { x: cx - newRadius, y: cy },     // left
    ]
    e.target.x(handlePositions[handleIndex].x)
    e.target.y(handlePositions[handleIndex].y)
  }, [data, cx, cy, onResize])

  const handles = selected ? [
    { x: cx, y: cy - radius },     // top
    { x: cx + radius, y: cy },     // right
    { x: cx, y: cy + radius },     // bottom
    { x: cx - radius, y: cy },     // left
  ] : []

  // SELECT 模式 hover 时显示半透明填充
  const hoverFill = isSelectTool && hovered ? data.color + '30' : undefined

  return (
    <Group>
      <KonvaCircle
        x={cx}
        y={cy}
        radius={radius}
        fill={hoverFill}
        stroke={hovered ? lightenColor(data.color) : data.color}
        strokeWidth={hovered ? data.strokeWidth + 1 : data.strokeWidth}
        draggable={isSelectTool}
        onClick={handleClick}
        onTap={handleClick}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {handles.map((pos, i) => (
        <KonvaCircle
          key={i}
          x={pos.x}
          y={pos.y}
          radius={HANDLE_SIZE / 2}
          fill="white"
          stroke={data.color}
          strokeWidth={1}
          hitStrokeWidth={HANDLE_HIT_STROKE_WIDTH}
          draggable
          onDragMove={(e) => handleHandleDrag(i, e)}
        />
      ))}
    </Group>
  )
}

function lightenColor(color: string): string {
  return color + '80'
}

export { CircleShapeView }
