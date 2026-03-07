import React, { useState, useCallback } from 'react'
import { Circle as KonvaCircle, Group } from 'react-konva'
import type { AnnotationData, Point } from '../../types/annotation'

interface CircleShapeViewProps {
  data: AnnotationData
  selected: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, startPoint: Point, endPoint: Point) => void
  onResize: (id: string, startPoint: Point, endPoint: Point) => void
}

const HANDLE_SIZE = 8

function CircleShapeView({ data, selected, onSelect, onDragEnd, onResize }: CircleShapeViewProps) {
  const [hovered, setHovered] = useState(false)

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

  const handleHandleDrag = useCallback((handleIndex: number, e: { target: { x: () => number; y: () => number } }) => {
    const hx = e.target.x()
    const hy = e.target.y()

    // 计算新的半径：handle到圆心的距离
    const hdx = hx - cx
    const hdy = hy - cy
    const newRadius = Math.sqrt(hdx * hdx + hdy * hdy)

    // 保持圆心不变，更新 endPoint 使 radius 匹配
    onResize(data.id, data.startPoint, { x: cx + newRadius, y: cy })
  }, [data, cx, cy, onResize])

  const handles = selected ? [
    { x: cx, y: cy - radius },     // top
    { x: cx + radius, y: cy },     // right
    { x: cx, y: cy + radius },     // bottom
    { x: cx - radius, y: cy },     // left
  ] : []

  return (
    <Group>
      <KonvaCircle
        x={cx}
        y={cy}
        radius={radius}
        stroke={hovered ? lightenColor(data.color) : data.color}
        strokeWidth={hovered ? data.strokeWidth + 1 : data.strokeWidth}
        draggable={selected}
        onClick={handleClick}
        onTap={handleClick}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
