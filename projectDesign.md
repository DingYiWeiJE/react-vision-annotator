# 一、架构（React 专用）

简化为 **两层结构**：

```
Annotation SDK
│
├─ Core（业务核心，框架无关）
│   ├─ Shape系统
│   ├─ AnnotationManager
│   ├─ SelectionManager
│   ├─ ToolController
│   └─ ViewportController
│
└─ React Layer
    ├─ Canvas组件
    ├─ Shape组件
    └─ Hooks
```

职责：

| 层          | 职责                             |
| ----------- | -------------------------------- |
| Core        | 标注逻辑，纯 TypeScript，无框架依赖 |
| React Layer | 渲染与交互，调用 Konva            |

核心原则：

```
所有业务逻辑在 Core
React 只负责 UI
Core 不得引用任何 React / Konva 依赖
```

------

# 二、npm 包结构

未来发布：

```
yarn add react-vision-annotator
```

项目结构建议：

```
src
│
├─ core
│   ├─ shapes
│   │   ├─ BaseShape.ts
│   │   ├─ RectShape.ts
│   │   ├─ CircleShape.ts
│   │   └─ ShapeFactory.ts
│   │
│   ├─ annotation
│   │   └─ AnnotationManager.ts
│   │
│   ├─ selection
│   │   └─ SelectionManager.ts
│   │
│   ├─ tools
│   │   └─ ToolController.ts
│   │
│   ├─ history
│   │   └─ HistoryManager.ts
│   │
│   └─ viewport
│       └─ ViewportController.ts
│
├─ react
│   ├─ components
│   │   ├─ AnnotationCanvas.tsx
│   │   ├─ ImageLayer.tsx
│   │   ├─ ShapeLayer.tsx
│   │   └─ InteractionLayer.tsx
│   │
│   ├─ shapes
│   │   ├─ RectShapeView.tsx
│   │   └─ CircleShapeView.tsx
│   │
│   └─ hooks
│       └─ useAnnotationEngine.ts
│
├─ types
│   └─ annotation.ts
│
└─ index.ts
```

------

# 三、核心数据模型

统一 JSON 数据结构（必须固定）。

坐标语义约定：

| 类型   | startPoint        | endPoint                   |
| ------ | ----------------- | -------------------------- |
| Rect   | 绘制时鼠标按下的点 | 绘制时鼠标释放的点          |
| Circle | 圆心              | 绘制时鼠标释放的点（圆周上） |

运行时派生值（不存储，按需计算）：

| 类型   | 派生计算                                                    |
| ------ | ----------------------------------------------------------- |
| Rect   | `x = min(x1,x2)`, `y = min(y1,y2)`, `width`, `height`      |
| Circle | `radius = sqrt((x2-x1)² + (y2-y1)²)`                       |

```ts
export type Point = {
  x: number
  y: number
}

export type AnnotationData = {
  id: string
  type: "rect" | "circle"
  startPoint: Point  // Rect: 绘制起点；Circle: 圆心
  endPoint: Point    // Rect: 绘制终点；Circle: 圆周上一点
  label?: string     // 标注类别，如 "cat" / "car"
  color: string
  strokeWidth: number
  visible?: boolean  // 默认 true，控制显隐
}
```

示例：

```json
{
  "id": "1",
  "type": "rect",
  "startPoint": { "x": 100, "y": 120 },
  "endPoint":   { "x": 300, "y": 270 },
  "label": "cat",
  "color": "#ff0000",
  "strokeWidth": 2,
  "visible": true
}

{
  "id": "2",
  "type": "circle",
  "startPoint": { "x": 200, "y": 200 },
  "endPoint":   { "x": 260, "y": 200 },
  "label": "wheel",
  "color": "#00ff00",
  "strokeWidth": 2,
  "visible": true
}
```

后端 AI 返回：

```
bbox
↓
转换为 AnnotationData（startPoint / endPoint）
↓
渲染
```

------

# 四、Shape 面向对象设计（核心）

所有标注继承：

```
BaseShape
```

结构：

```
BaseShape
   │
   ├─ RectShape
   └─ CircleShape
```

BaseShape 职责：

```
位置
样式
选中状态
拖拽逻辑
碰撞检测
包围盒
序列化
```

设计：

```ts
abstract class BaseShape {

  id: string
  label: string
  color: string
  strokeWidth: number
  selected: boolean = false
  visible: boolean = true

  // 存储格式：两点坐标
  startPoint: Point   // Rect: 绘制起点；Circle: 圆心
  endPoint: Point     // Rect: 绘制终点；Circle: 圆周上一点

  // 移动位置（同时平移两点）
  abstract move(dx: number, dy: number): void

  // 点击命中检测
  abstract contains(x: number, y: number): boolean

  // 返回包围盒（用于框选判断）
  abstract getBounds(): { x: number; y: number; width: number; height: number }

  // 序列化为 AnnotationData
  abstract toJSON(): AnnotationData

}
```

------

## RectShape

```ts
class RectShape extends BaseShape {

  // 派生属性（按需计算，不存储）
  get x()      { return Math.min(this.startPoint.x, this.endPoint.x) }
  get y()      { return Math.min(this.startPoint.y, this.endPoint.y) }
  get width()  { return Math.abs(this.endPoint.x - this.startPoint.x) }
  get height() { return Math.abs(this.endPoint.y - this.startPoint.y) }

  move(dx, dy) {
    this.startPoint = { x: this.startPoint.x + dx, y: this.startPoint.y + dy }
    this.endPoint   = { x: this.endPoint.x + dx,   y: this.endPoint.y + dy }
  }

  contains(x: number, y: number): boolean {
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }

  toJSON(): AnnotationData {
    return {
      id: this.id,
      type: 'rect',
      startPoint: { ...this.startPoint },
      endPoint:   { ...this.endPoint },
      label: this.label,
      color: this.color,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
    }
  }

}
```

------

## CircleShape

```ts
class CircleShape extends BaseShape {

  // startPoint = 圆心，endPoint = 圆周上一点
  get cx()     { return this.startPoint.x }
  get cy()     { return this.startPoint.y }
  get radius() {
    const dx = this.endPoint.x - this.startPoint.x
    const dy = this.endPoint.y - this.startPoint.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  move(dx, dy) {
    this.startPoint = { x: this.startPoint.x + dx, y: this.startPoint.y + dy }
    this.endPoint   = { x: this.endPoint.x + dx,   y: this.endPoint.y + dy }
  }

  contains(x: number, y: number): boolean {
    const dx = x - this.cx
    const dy = y - this.cy
    return Math.sqrt(dx * dx + dy * dy) <= this.radius
  }

  getBounds() {
    const r = this.radius
    return { x: this.cx - r, y: this.cy - r, width: r * 2, height: r * 2 }
  }

  toJSON(): AnnotationData {
    return {
      id: this.id,
      type: 'circle',
      startPoint: { ...this.startPoint },
      endPoint:   { ...this.endPoint },
      label: this.label,
      color: this.color,
      strokeWidth: this.strokeWidth,
      visible: this.visible,
    }
  }

}
```

------

## ShapeFactory（JSON → Shape 实例）

`AnnotationManager.load()` 依赖此工厂将 `AnnotationData` 还原为具体 Shape 实例。

```ts
class ShapeFactory {

  static create(data: AnnotationData): BaseShape {
    switch (data.type) {
      case 'rect':   return new RectShape(data)
      case 'circle': return new CircleShape(data)
      default:       throw new Error(`Unknown shape type: ${data.type}`)
    }
  }

}
```

------

# 五、AnnotationManager

负责：

```
管理所有标注
状态变更通知（供 React 层订阅）
```

职责：

```
新增
删除
更新
JSON导入（通过 ShapeFactory 还原实例）
JSON导出
状态变更回调
```

接口：

```ts
class AnnotationManager {

  private shapes: BaseShape[]
  private onChange?: (shapes: BaseShape[]) => void

  // 注册变更回调（由 useAnnotationEngine 注入）
  subscribe(cb: (shapes: BaseShape[]) => void): void

  add(shape: BaseShape): void

  remove(id: string): void

  update(shape: BaseShape): void

  getAll(): BaseShape[]

  getById(id: string): BaseShape | undefined

  // 使用 ShapeFactory 将 AnnotationData[] 还原为 BaseShape[]
  load(json: AnnotationData[]): void

  export(): AnnotationData[]

  // 所有写操作执行后调用此方法通知订阅者
  private notify(): void

}
```

------

# 六、SelectionManager（框选）

框选模式：

```
BOX_SELECT
```

逻辑：

```
mousedown
↓
记录起点
↓
mousemove
↓
绘制 selection box
↓
mouseup
↓
判断 shapes 是否在 box 内
```

判断规则（完全包含）：

```
shape.getBounds() 完全在 selectionBox 内
即：
  shape.x >= box.x &&
  shape.y >= box.y &&
  shape.x + shape.width <= box.x + box.width &&
  shape.y + shape.height <= box.y + box.height
```

接口：

```ts
class SelectionManager {

  // 持有 AnnotationManager 引用，用于 selectByBox 时遍历所有 shapes
  constructor(annotationManager: AnnotationManager)

  select(ids: string[]): void

  clear(): void

  getSelected(): BaseShape[]

  selectByBox(box: { x: number; y: number; width: number; height: number }): void

}
```

------

# 七、ToolController

负责当前工具模式。

```
SELECT
DRAW_RECT
DRAW_CIRCLE
BOX_SELECT
```

设计：

```ts
enum ToolMode {
  SELECT,
  DRAW_RECT,
  DRAW_CIRCLE,
  BOX_SELECT,
}
```

Controller：

```ts
class ToolController {

  mode: ToolMode

  setMode(mode: ToolMode): void

}
```

------

# 八、ViewportController（图片变换）

负责：

```
zoom
pan
rotate
```

状态（纯数据，无框架依赖）：

```ts
interface ViewportState {
  scale: number      // 缩放比例，默认 1
  rotation: number   // 旋转角度，默认 0
  offsetX: number    // 平移X，默认 0
  offsetY: number    // 平移Y，默认 0
}
```

接口：

```ts
class ViewportController {

  readonly MIN_SCALE = 0.1
  readonly MAX_SCALE = 10
  readonly ZOOM_STEP = 0.1

  state: ViewportState

  zoomIn(): void

  zoomOut(): void

  rotate(deg: number): void

  pan(dx: number, dy: number): void

  reset(): void

  getState(): ViewportState

  // 将屏幕坐标转换为图像坐标（考虑 scale / offset）
  // 鼠标事件坐标必须经此方法转换后才能传给 Core 层
  screenToImage(screenX: number, screenY: number): Point

}
```

说明：

```
ViewportController 只维护纯状态数据
React Layer 读取 state 后负责同步到 Konva Stage
Core 层不引用 Konva
所有鼠标事件坐标须经 screenToImage() 转换为图像坐标再传入 Core
```

------

# 八·五、HistoryManager（Undo / Redo）

键盘快捷键 `Ctrl+Z` / `Ctrl+Y` 依赖此模块。

原理：**快照栈**，每次写操作前记录当前 `AnnotationData[]` 快照。

```ts
class HistoryManager {

  private past:   AnnotationData[][]   // 撤销栈
  private future: AnnotationData[][]   // 重做栈
  readonly MAX_HISTORY = 50

  // 写操作前由 AnnotationManager 调用，推入当前快照
  push(snapshot: AnnotationData[]): void

  // 撤销：返回上一个快照（无可撤销时返回 null）
  undo(): AnnotationData[] | null

  // 重做：返回下一个快照（无可重做时返回 null）
  redo(): AnnotationData[] | null

  clear(): void

}
```

集成方式：

```
AnnotationManager 中每次 add / remove / update 前
↓
调用 historyManager.push(this.export())
↓
Ctrl+Z 触发时调用 historyManager.undo()
↓
将返回的快照传给 annotationManager.load() 恢复状态
```

------

# 九、React 渲染层

React 组件结构：

```
AnnotationCanvas
│
├ ImageLayer
│
├ ShapeLayer
│   ├ RectShapeView
│   └ CircleShapeView
│
└ InteractionLayer
```

React Layer 职责：

```
读取 ViewportController.state → 同步到 Konva Stage
监听鼠标键盘事件 → 调用 Core 层方法
将 Core 状态变更 → 触发 React 重渲染
```

## InteractionLayer

透明的顶层 Konva Layer，专门负责接收鼠标 / 键盘事件，不渲染任何 Shape。

职责：

```
DRAW_RECT / DRAW_CIRCLE 模式：
  mousedown → 记录起点
  mousemove → 更新绘制预览（虚线轮廓，存入 drawingShape 临时 state）
  mouseup   → 确认创建，调用 annotationManager.add()

BOX_SELECT 模式：
  mousedown / mousemove / mouseup → 绘制选框，调用 selectionManager.selectByBox()

SELECT 模式：
  click 空白区域 → selectionManager.clear()

键盘事件（注册在 window）：
  Delete / Backspace → 删除选中
  Escape            → clear selection / 取消绘制
  Ctrl+Z            → historyManager.undo()
  Ctrl+Y            → historyManager.redo()
```

绘制预览说明：

```
绘制进行中时，使用 React state 维护一个临时 drawingShape（虚线样式）
mouseup 时将 drawingShape 提交给 AnnotationManager，清空临时 state
```

------

# 十、useAnnotationEngine（核心 Hook）

封装所有 Core 层实例，供组件使用。

```ts
function useAnnotationEngine(initialAnnotations?: AnnotationData[]) {

  // 内部持有 Core 层实例
  const annotationManager  = useRef(new AnnotationManager())
  const selectionManager   = useRef(new SelectionManager(annotationManager.current))
  const toolController     = useRef(new ToolController())
  const viewportController = useRef(new ViewportController())
  const historyManager     = useRef(new HistoryManager())

  // 触发重渲染的状态
  const [shapes, setShapes] = useState<AnnotationData[]>(initialAnnotations ?? [])
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1, rotation: 0, offsetX: 0, offsetY: 0,
  })

  // 订阅 Core 层变更，Core 写操作完成后自动同步到 React state
  useEffect(() => {
    annotationManager.current.subscribe((updated) => {
      setShapes(updated.map(s => s.toJSON()))
    })
    if (initialAnnotations) {
      annotationManager.current.load(initialAnnotations)
    }
  }, [])

  // 对外暴露的操作方法
  return {
    shapes,
    viewport,
    tool: toolController.current.mode,
    setTool,
    addShape,
    removeShape,
    updateShape,
    selectByBox,
    clearSelection,
    getSelected,
    zoomIn,
    zoomOut,
    rotate,
    reset,
    undo,
    redo,
    load,
    export: exportJSON,
  }
}
```

------

# 十一、AnnotationCanvas

核心组件：

```tsx
<AnnotationCanvas
  ref={canvasRef}
  image={url}
  annotations={data}
  tool={ToolMode.DRAW_RECT}   // 使用 ToolMode 枚举，不用字符串
  strokeWidth={2}
  color="red"
  readOnly={false}
  onChange={handleChange}     // 每次标注变更时回调
/>
```

职责：

```
创建 Konva Stage
处理鼠标 / 键盘事件
调用 useAnnotationEngine
读�� ViewportController.state 同步到 Konva Stage
```

键盘快捷键：

```
Delete / Backspace  → 删除选中标注
Escape              → 取消选中 / 退出绘制
Ctrl+Z              → 撤销（Undo）
Ctrl+Y              → 重做（Redo）
```

------

# 十二、onChange 回调格式

每次标注发生变化时触发：

```ts
type OnChangeCallback = (annotations: AnnotationData[]) => void
```

示例：

```ts
const handleChange = (annotations: AnnotationData[]) => {
  // annotations 为当前所有标注的最新快照
  console.log(annotations)
}
```

------

# 十三、Ref 命令式 API

通过 `ref` 从外部调用 SDK 方法：

```ts
interface AnnotationCanvasRef {
  load(annotations: AnnotationData[]): void
  export(): AnnotationData[]
  zoomIn(): void
  zoomOut(): void
  rotate(deg: number): void
  reset(): void
  clearSelection(): void
  deleteSelected(): void
}
```

使用示例：

```tsx
const canvasRef = useRef<AnnotationCanvasRef>(null)

// 从后端加载标注
canvasRef.current?.load(backendAnnotations)

// 导出标注
const result = canvasRef.current?.export()
```

------

# 十四、ShapeLayer

渲染 shapes：

```
annotationManager.getAll()
```

React 渲染：

```
map → ShapeView（跳过 visible=false 的 shape）
```

------

# 十五、ShapeView（React 组件）

Rect：

```
RectShapeView
```

Circle：

```
CircleShapeView
```

内部使用：

```
Konva Rect
Konva Circle
```

支持：

```
hover（高亮）
click（选中）
drag（拖拽移动）
resize handle（缩放调整）
```

------

# 十六、hover 高亮

hover 时：

```
strokeWidth + 1
color change
```

通过 React state 控制。

------

# 十七、拖拽修改位置

Konva：

```
draggable
```

监听：

```
onDragMove
```

更新：

```
shape.move()
```

------

# 十八、Resize Handle

每个选中的 Shape 显示控制点（handle）：

```
RectShape：4个角 + 4条边中点，共 8 个 handle
CircleShape：4个方向，共 4 个 handle
```

逻辑：

```
拖动 handle
↓
计算新的 width / height / radius
↓
更新 shape 数据
↓
触发 onChange
```

------

# 十九、JSON 渲染

后端返回：

```
annotations[]
```

SDK：

```
AnnotationManager.load()
```

React 自动渲染。

------

# 二十、批量操作

流程：

```
SelectionManager
↓
selectedShapes
↓
applyAction
```

例如：

```
delete
changeColor
changeStrokeWidth
changeLabel
```

------

# 二十一、SDK 对外 API

SDK 导出：

```ts
// 组件
export { AnnotationCanvas } from "./react/components/AnnotationCanvas"

// 枚举
export { ToolMode } from "./core/tools/ToolController"

// 类型
export type { AnnotationData } from "./types/annotation"
export type { AnnotationCanvasRef } from "./react/components/AnnotationCanvas"
export type { ViewportState } from "./core/viewport/ViewportController"
```

使用示例：

```ts
import {
  AnnotationCanvas,
  ToolMode,
  type AnnotationData,
  type AnnotationCanvasRef,
} from "react-vision-annotator"
```

------

# 二十二、未来扩展能力

未来新增：

```
PolygonShape
MaskShape
KeypointShape
```

只需：

```
extends BaseShape
```

实现：

```
move()
contains()
getBounds()
toJSON()
```

渲染组件：

```
PolygonShapeView
```
