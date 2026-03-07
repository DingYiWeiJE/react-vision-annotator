import { describe, it, expect, vi } from 'vitest'
import { AnnotationManager } from './AnnotationManager'
import { RectShape } from '../shapes/RectShape'
import { ShapeFactory } from '../shapes/ShapeFactory'
import type { AnnotationData } from '../../types/annotation'

const makeRect = (id: string): AnnotationData => ({
  id,
  type: 'rect',
  startPoint: { x: 0, y: 0 },
  endPoint: { x: 100, y: 100 },
  color: '#ff0000',
  strokeWidth: 2,
})

describe('AnnotationManager', () => {
  it('add() 应添加 shape 并通知订阅者', () => {
    const manager = new AnnotationManager()
    const cb = vi.fn()
    manager.subscribe(cb)

    const shape = new RectShape(makeRect('1'))
    manager.add(shape)

    expect(manager.getAll()).toHaveLength(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('remove() 应删除指定 shape', () => {
    const manager = new AnnotationManager()
    manager.add(new RectShape(makeRect('1')))
    manager.add(new RectShape(makeRect('2')))

    manager.remove('1')
    expect(manager.getAll()).toHaveLength(1)
    expect(manager.getById('1')).toBeUndefined()
  })

  it('update() 应替换同 id 的 shape', () => {
    const manager = new AnnotationManager()
    manager.add(new RectShape(makeRect('1')))

    const updated = new RectShape({
      ...makeRect('1'),
      color: '#00ff00',
    })
    manager.update(updated)

    expect(manager.getById('1')?.color).toBe('#00ff00')
  })

  it('getById() 不存在时返回 undefined', () => {
    const manager = new AnnotationManager()
    expect(manager.getById('nonexistent')).toBeUndefined()
  })

  it('load() 应通过 ShapeFactory 还原所有 shapes', () => {
    const manager = new AnnotationManager()
    const cb = vi.fn()
    manager.subscribe(cb)

    manager.load([makeRect('1'), makeRect('2')])

    expect(manager.getAll()).toHaveLength(2)
    expect(cb).toHaveBeenCalled()
  })

  it('export() 应返回所有 shapes 的 JSON', () => {
    const manager = new AnnotationManager()
    const data = [makeRect('1'), makeRect('2')]
    manager.load(data)

    const exported = manager.export()
    expect(exported).toHaveLength(2)
    expect(exported[0].id).toBe('1')
    expect(exported[1].id).toBe('2')
  })
})
