# 代码规范（CONVENTIONS）

## TypeScript

- 严格模式（`strict: true`），禁止 `any`，禁止 `@ts-ignore`
- 优先用 `interface` 描述对象形状，用 `type` 描述联合类型 / 工具类型
- 函数参数超过 3 个时改用 options 对象
- 枚举统一用 `const enum`（编译后无运行时开销）

## 文件与命名

| 场景 | 命名规则 | 示例 |
| ---- | -------- | ---- |
| React 组件文件 | PascalCase | `AnnotationCanvas.tsx` |
| Core 类文件 | PascalCase | `AnnotationManager.ts` |
| Hook 文件 | camelCase，前缀 `use` | `useAnnotationEngine.ts` |
| 类型文件 | camelCase | `annotation.ts` |

- 每个文件只导出一个主体（类或组件），辅助类型可同文件导出
- 测试文件与源文件同目录，命名 `*.test.ts` / `*.test.tsx`

## React 组件

- 函数组件，禁止 class 组件
- Props 类型用 `interface`，命名 `XxxProps`
- Ref 类型命名 `XxxRef`，通过 `useImperativeHandle` 暴露
- 组件内不写业务逻辑，调用 hook 或 Core 层方法

```tsx
// 好
function RectShapeView({ shape, selected }: RectShapeViewProps) {
  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    const { x, y } = e.target.position()
    onMove(shape.id, x, y)
  }, [shape.id, onMove])
  return <Rect ... />
}

// 禁止：在组件内直接操作 annotationManager
function RectShapeView(...) {
  annotationManager.update(...)  // ❌ 业务逻辑不属于组件
}
```

## Core 层类

- 构造函数只做初始化，不做 IO 或异步操作
- 写操作（`add/remove/update/load`）结束时调用 `this.notify()`
- `private` 优先，���小化公开接口

```ts
// 好
class AnnotationManager {
  private shapes: BaseShape[] = []
  private onChange?: (shapes: BaseShape[]) => void

  add(shape: BaseShape): void {
    this.shapes.push(shape)
    this.notify()
  }

  private notify(): void {
    this.onChange?.(this.shapes)
  }
}
```

## 注释

- 禁止写"是什么"的注释（代码本身已经说明）
- 只写"为什么"：解释非显而易见的决策或陷阱

```ts
// 禁止
// 将 shape 添加到数组
this.shapes.push(shape)

// 正确：解释为什么
// 先 push 再 notify，确保订阅者拿到的是已含新 shape 的列表
this.shapes.push(shape)
this.notify()
```

## 测试

- Core 层：100% 单元测试覆盖，不 mock 内部依赖
- React 层：只测试交互行为，不测试 Konva 渲染细节
- 测试描述用中文，方便阅读

```ts
describe('RectShape', () => {
  it('contains() 应正确判断点是否在矩形内', () => { ... })
  it('move() 应同时平移 startPoint 和 endPoint', () => { ... })
})
```
