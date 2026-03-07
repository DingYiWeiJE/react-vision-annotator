import { describe, it, expect } from 'vitest'
import { HistoryManager } from './HistoryManager'
import type { AnnotationData } from '../../types/annotation'

const makeSnapshot = (ids: string[]): AnnotationData[] =>
  ids.map(id => ({
    id,
    type: 'rect' as const,
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 100, y: 100 },
    color: '#ff0000',
    strokeWidth: 2,
  }))

describe('HistoryManager', () => {
  it('undo() 应返回上一个快照', () => {
    const hm = new HistoryManager()
    hm.push(makeSnapshot(['1']))
    hm.push(makeSnapshot(['1', '2']))

    const result = hm.undo()
    expect(result).toHaveLength(2)
  })

  it('undo() 无快照时返回 null', () => {
    const hm = new HistoryManager()
    expect(hm.undo()).toBeNull()
  })

  it('redo() 应返回下一个快照', () => {
    const hm = new HistoryManager()
    hm.push(makeSnapshot(['1']))

    const undone = hm.undo()
    expect(undone).not.toBeNull()

    hm.pushToFuture(makeSnapshot(['1', '2']))
    const result = hm.redo()
    expect(result).toHaveLength(2)
  })

  it('redo() 无快照时返回 null', () => {
    const hm = new HistoryManager()
    expect(hm.redo()).toBeNull()
  })

  it('push() 应清空 future 栈', () => {
    const hm = new HistoryManager()
    hm.push(makeSnapshot(['1']))
    hm.pushToFuture(makeSnapshot(['1', '2']))
    hm.push(makeSnapshot(['3']))
    expect(hm.redo()).toBeNull()
  })

  it('push() 超过 MAX_HISTORY 时应丢弃最早的快照', () => {
    const hm = new HistoryManager()
    for (let i = 0; i < 55; i++) {
      hm.push(makeSnapshot([String(i)]))
    }
    let count = 0
    while (hm.undo() !== null) count++
    expect(count).toBe(50)
  })

  it('clear() 应清空所有快照', () => {
    const hm = new HistoryManager()
    hm.push(makeSnapshot(['1']))
    hm.pushToFuture(makeSnapshot(['2']))
    hm.clear()
    expect(hm.undo()).toBeNull()
    expect(hm.redo()).toBeNull()
  })

  it('push() 应深拷贝快照数据', () => {
    const hm = new HistoryManager()
    const snapshot = makeSnapshot(['1'])
    hm.push(snapshot)
    snapshot[0].color = '#000000'
    const result = hm.undo()
    expect(result?.[0].color).toBe('#ff0000')
  })
})
