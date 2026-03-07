import { describe, it, expect } from 'vitest'
import { ViewportController } from './ViewportController'

describe('ViewportController', () => {
  it('初始状态应为默认值', () => {
    const vc = new ViewportController()
    expect(vc.getState()).toEqual({
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('zoomIn() 应增加 scale', () => {
    const vc = new ViewportController()
    vc.zoomIn()
    expect(vc.getState().scale).toBeCloseTo(1.1)
  })

  it('zoomOut() 应减少 scale', () => {
    const vc = new ViewportController()
    vc.zoomOut()
    expect(vc.getState().scale).toBeCloseTo(0.9)
  })

  it('zoomIn() 不应超过 MAX_SCALE', () => {
    const vc = new ViewportController()
    for (let i = 0; i < 200; i++) vc.zoomIn()
    expect(vc.getState().scale).toBeLessThanOrEqual(10)
  })

  it('zoomOut() 不应低于 MIN_SCALE', () => {
    const vc = new ViewportController()
    for (let i = 0; i < 200; i++) vc.zoomOut()
    expect(vc.getState().scale).toBeGreaterThanOrEqual(0.1)
  })

  it('rotate() 应累加旋转角度', () => {
    const vc = new ViewportController()
    vc.rotate(90)
    expect(vc.getState().rotation).toBe(90)
    vc.rotate(90)
    expect(vc.getState().rotation).toBe(180)
  })

  it('rotate() 应对 360 取模', () => {
    const vc = new ViewportController()
    vc.rotate(370)
    expect(vc.getState().rotation).toBe(10)
  })

  it('pan() 应累加偏移量', () => {
    const vc = new ViewportController()
    vc.pan(50, 30)
    expect(vc.getState().offsetX).toBe(50)
    expect(vc.getState().offsetY).toBe(30)
    vc.pan(-20, 10)
    expect(vc.getState().offsetX).toBe(30)
    expect(vc.getState().offsetY).toBe(40)
  })

  it('reset() 应恢复默认状态', () => {
    const vc = new ViewportController()
    vc.zoomIn()
    vc.rotate(45)
    vc.pan(100, 200)
    vc.reset()
    expect(vc.getState()).toEqual({
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    })
  })

  it('screenToImage() 应正确转换坐标', () => {
    const vc = new ViewportController()
    // 默认 scale=1, offset=0
    expect(vc.screenToImage(100, 200)).toEqual({ x: 100, y: 200 })

    // scale=2, offset=(50, 50)
    vc.zoomIn() // 1.1
    for (let i = 0; i < 9; i++) vc.zoomIn() // 2.0
    vc.pan(50, 50)
    const point = vc.screenToImage(150, 150)
    expect(point.x).toBeCloseTo(50)
    expect(point.y).toBeCloseTo(50)
  })

  it('subscribe() 应在状态变更时收到通知', () => {
    const vc = new ViewportController()
    let received = false
    vc.subscribe(() => { received = true })
    vc.zoomIn()
    expect(received).toBe(true)
  })
})
