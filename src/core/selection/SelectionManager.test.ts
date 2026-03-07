import { describe, it, expect } from 'vitest'
import { SelectionManager } from './SelectionManager'
import { AnnotationManager } from '../annotation/AnnotationManager'
import { RectShape } from '../shapes/RectShape'
import type { AnnotationData } from '../../types/annotation'

const makeRect = (id: string, x: number, y: number, w: number, h: number): AnnotationData => ({
  id,
  type: 'rect',
  startPoint: { x, y },
  endPoint: { x: x + w, y: y + h },
  color: '#ff0000',
  strokeWidth: 2,
})

function setup() {
  const am = new AnnotationManager()
  am.add(new RectShape(makeRect('1', 10, 10, 50, 50)))
  am.add(new RectShape(makeRect('2', 100, 100, 50, 50)))
  am.add(new RectShape(makeRect('3', 200, 200, 50, 50)))
  const sm = new SelectionManager(am)
  return { am, sm }
}

describe('SelectionManager', () => {
  it('select() 应选中指定 ids', () => {
    const { sm } = setup()
    sm.select(['1', '2'])
    expect(sm.getSelected()).toHaveLength(2)
    expect(sm.isSelected('1')).toBe(true)
    expect(sm.isSelected('3')).toBe(false)
  })

  it('clear() 应清空所有选中', () => {
    const { sm } = setup()
    sm.select(['1', '2'])
    sm.clear()
    expect(sm.getSelected()).toHaveLength(0)
  })

  it('selectByBox() 应选中完全在框内的 shapes', () => {
    const { sm } = setup()

    // 框住 shape 1 和 2
    sm.selectByBox({ x: 0, y: 0, width: 160, height: 160 })
    expect(sm.getSelected()).toHaveLength(2)
    expect(sm.isSelected('1')).toBe(true)
    expect(sm.isSelected('2')).toBe(true)
    expect(sm.isSelected('3')).toBe(false)
  })

  it('selectByBox() 部分包含不应被选中', () => {
    const { sm } = setup()
    sm.selectByBox({ x: 0, y: 0, width: 50, height: 50 })
    // shape 1 的 bounds 是 {10,10,50,50}，右下角 60,60 超出 50,50
    expect(sm.getSelected()).toHaveLength(0)
  })

  it('select() 应更新 shape 的 selected 属性', () => {
    const { am, sm } = setup()
    sm.select(['1'])
    expect(am.getById('1')?.selected).toBe(true)
    expect(am.getById('2')?.selected).toBe(false)
  })
})
