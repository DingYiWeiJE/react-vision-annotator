import { describe, it, expect } from 'vitest'
import { RectShape } from './RectShape'
import { CircleShape } from './CircleShape'
import type { AnnotationData } from '../../types/annotation'

const rectData: AnnotationData = {
  id: '1',
  type: 'rect',
  startPoint: { x: 100, y: 120 },
  endPoint: { x: 300, y: 270 },
  label: 'cat',
  color: '#ff0000',
  strokeWidth: 2,
  visible: true,
}

const circleData: AnnotationData = {
  id: '2',
  type: 'circle',
  startPoint: { x: 200, y: 200 },
  endPoint: { x: 260, y: 200 },
  label: 'wheel',
  color: '#00ff00',
  strokeWidth: 2,
  visible: true,
}

describe('RectShape', () => {
  it('应正确计算派生属性 x/y/width/height', () => {
    const rect = new RectShape(rectData)
    expect(rect.x).toBe(100)
    expect(rect.y).toBe(120)
    expect(rect.width).toBe(200)
    expect(rect.height).toBe(150)
  })

  it('startPoint 大于 endPoint 时也应正确计算', () => {
    const rect = new RectShape({
      ...rectData,
      startPoint: { x: 300, y: 270 },
      endPoint: { x: 100, y: 120 },
    })
    expect(rect.x).toBe(100)
    expect(rect.y).toBe(120)
    expect(rect.width).toBe(200)
    expect(rect.height).toBe(150)
  })

  it('contains() 应正确判断点是否在矩形内', () => {
    const rect = new RectShape(rectData)
    expect(rect.contains(150, 150)).toBe(true)
    expect(rect.contains(100, 120)).toBe(true)
    expect(rect.contains(300, 270)).toBe(true)
    expect(rect.contains(50, 50)).toBe(false)
    expect(rect.contains(350, 350)).toBe(false)
  })

  it('move() 应同时平移 startPoint 和 endPoint', () => {
    const rect = new RectShape(rectData)
    rect.move(10, 20)
    expect(rect.startPoint).toEqual({ x: 110, y: 140 })
    expect(rect.endPoint).toEqual({ x: 310, y: 290 })
  })

  it('getBounds() 应返回正确的包围盒', () => {
    const rect = new RectShape(rectData)
    expect(rect.getBounds()).toEqual({ x: 100, y: 120, width: 200, height: 150 })
  })

  it('toJSON() 应序列化为 AnnotationData', () => {
    const rect = new RectShape(rectData)
    const json = rect.toJSON()
    expect(json).toEqual(rectData)
    // 确保是深拷贝
    expect(json.startPoint).not.toBe(rect.startPoint)
  })

  it('selected 默认为 false', () => {
    const rect = new RectShape(rectData)
    expect(rect.selected).toBe(false)
  })
})

describe('CircleShape', () => {
  it('应正确计算派生属性 cx/cy/radius', () => {
    const circle = new CircleShape(circleData)
    expect(circle.cx).toBe(200)
    expect(circle.cy).toBe(200)
    expect(circle.radius).toBe(60)
  })

  it('contains() 应正确判断点是否在圆内', () => {
    const circle = new CircleShape(circleData)
    expect(circle.contains(200, 200)).toBe(true)
    expect(circle.contains(260, 200)).toBe(true)
    expect(circle.contains(200, 260)).toBe(true)
    expect(circle.contains(300, 300)).toBe(false)
  })

  it('move() 应同时平移 startPoint 和 endPoint', () => {
    const circle = new CircleShape(circleData)
    circle.move(10, 20)
    expect(circle.startPoint).toEqual({ x: 210, y: 220 })
    expect(circle.endPoint).toEqual({ x: 270, y: 220 })
    expect(circle.radius).toBe(60)
  })

  it('getBounds() 应返回正确的包围盒', () => {
    const circle = new CircleShape(circleData)
    expect(circle.getBounds()).toEqual({ x: 140, y: 140, width: 120, height: 120 })
  })

  it('toJSON() 应序列化为 AnnotationData', () => {
    const circle = new CircleShape(circleData)
    const json = circle.toJSON()
    expect(json).toEqual(circleData)
    expect(json.startPoint).not.toBe(circle.startPoint)
  })
})
