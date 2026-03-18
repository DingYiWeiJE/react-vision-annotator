# react-vision-annotator 使用文档

React 图像标注组件，支持矩形/圆形标注、自由绘制（画笔/马赛克/橡皮擦）、填充形状、框选、拖拽移动、缩放旋转、撤销重做。

---

## 安装

```bash
npm install react-vision-annotator
# 或
pnpm add react-vision-annotator
```

**前置 peer 依赖：**

```bash
npm install react react-dom konva react-konva
```

---

## 快速开始

```tsx
import { AnnotationCanvas, ToolMode } from 'react-vision-annotator'

function App() {
  return (
    <div style={{ width: 800, height: 600 }}>
      <AnnotationCanvas
        image="https://example.com/photo.jpg"
        tool={ToolMode.DRAW_RECT}
        onChange={(annotations) => console.log(annotations)}
      />
    </div>
  )
}
```

> 画布宽高跟随父容器，父容器需要明确的尺寸。

---

## API 参考

### `<AnnotationCanvas>` Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `image` | `string` | **必填** | 图片 URL |
| `annotations` | `AnnotationData[]` | `[]` | 初始标注数据 |
| `tool` | `ToolMode` | `SELECT` | 当前工具模式 |
| `color` | `string` | `'#ff0000'` | 新标注 / 画笔颜色 |
| `strokeWidth` | `number` | `2` | 新标注线宽 |
| `readOnly` | `boolean` | `false` | 只读模式，禁止所有编辑 |
| `brushSize` | `number` | `4` | 画笔笔触��小 |
| `mosaicBrushSize` | `number` | `20` | 马赛克笔触大小 |
| `eraserSize` | `number` | `20` | 橡皮擦大小 |
| `mosaicPixelSize` | `number` | `10` | 马赛克像素块大小 |
| `drawingData` | `DrawingData` | — | 初始绘图数据（画笔/马赛克笔画） |
| `onChange` | `(annotations: AnnotationData[]) => void` | — | 标注变更回调 |
| `onSelectionChange` | `(ids: string[]) => void` | — | 选中状态变更回调 |
| `onBeforeHistoryChange` | `() => void` | — | 撤销/重做执行前回调 |
| `onDrawingChange` | `(data: DrawingData) => void` | — | 绘图笔画变更回调 |

---

### `AnnotationCanvasRef` 方法

```tsx
const canvasRef = useRef<AnnotationCanvasRef>(null)
```

**标注操作**

| 方法 | 说明 |
|------|------|
| `load(data: AnnotationData[])` | 加载（替换）所有标注，触发 `onChange` |
| `export(): AnnotationData[]` | 导出当前所有标注 |
| `getSelected(): AnnotationData[]` | 获取当前选中的标注 |
| `select(ids: string[])` | 以 ID 列表程序化选中标注 |
| `clearSelection()` | 清除选中状态 |
| `deleteSelected()` | 删除当前选中的标注 |
| `focusOn(id: string)` | 平移视口使指定标注居中显示 |

**视口操作**

| 方法 | 说明 |
|------|------|
| `zoomIn()` | 放大（每次 +0.1） |
| `zoomOut()` | 缩小（每次 -0.1） |
| `rotate(deg: number)` | 旋转指定角度（累加） |
| `reset()` | 重置视口（缩放/旋转/平移恢复默认） |

**绘图操作**

| 方法 | 说明 |
|------|------|
| `exportDrawingData(): DrawingData` | 导出所有绘图笔画数据 |
| `loadDrawingData(data: DrawingData)` | 加载绘图笔画数据 |
| `exportDrawingImage(): Promise<Blob \| null>` | 将图片与绘图合成导出为 PNG Blob |
| `clearDrawing()` | 清除所有绘图笔画 |

---

### `ToolMode` 枚举

**标注工具**

| 值 | 说明 |
|----|------|
| `SELECT` | 选择：点击选中、Ctrl+拖拽框选、拖拽移动 |
| `DRAW_RECT` | 绘制矩形标注 |
| `DRAW_CIRCLE` | 绘制圆形标注 |

**自由绘制工具**（鼠标按下拖拽连续绘制）

| 值 | 说明 |
|----|------|
| `BRUSH_DRAW` | 画笔，使用当前 `color` 颜色 |
| `MOSAIC_DRAW` | 马赛克涂抹 |
| `ERASER` | 橡皮擦，擦除画笔和马赛克笔画 |

**填充形状工具**（拖拽定义形状，松开鼠标一次性填充）

| 值 | 说明 |
|----|------|
| `BRUSH_FILL_RECT` | 矩形区域实心填充（画笔颜色） |
| `BRUSH_FILL_CIRCLE` | 圆形区域实心填充（画笔颜色） |
| `MOSAIC_FILL_RECT` | 矩形区域马赛克填充 |
| `MOSAIC_FILL_CIRCLE` | 圆形区域马赛克填充 |

> 填充工具适合需要遮盖大面积区域的场景，比逐笔涂抹效率更高。

---

### 类型定义

#### `AnnotationData`

```ts
interface AnnotationData {
  id: string
  type: 'rect' | 'circle'
  startPoint: { x: number; y: number }  // 矩形：左上角；圆形：圆心
  endPoint: { x: number; y: number }    // 矩形：右下角；圆形：圆周上一点
  label?: string
  color: string
  strokeWidth: number
  visible?: boolean                      // 默认 true
}
```

#### `DrawingData` / `DrawingStroke`

```ts
interface DrawingData {
  strokes: DrawingStroke[]
  mosaicPixelSize: number
}

interface DrawingStroke {
  id: string
  type: 'mosaic' | 'brush' | 'erase'
  fillShape?: 'rect' | 'circle'   // 填充形状工具产生的笔画有此字段
  points: number[]                 // 路径点 [x1,y1,x2,y2,...]；fillShape 时为 [x1,y1,x2,y2]
  brushSize: number
  color?: string                   // 仅 brush 类型有颜色
}
```

---

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Delete` / `Backspace` | 删除选中标注 |
| `Escape` | 取消选中 / 中止当前绘制 |
| `Ctrl+Z` | 撤销（标注 + 绘图统一历史栈） |
| `Ctrl+Y` | 重做 |

---

## 交互操作

| 操作 | 说明 |
|------|------|
| 绘制标注 | `DRAW_RECT` / `DRAW_CIRCLE` 模式下按下拖拽释放 |
| 选中标注 | `SELECT` 模式下点击标注 |
| 框选标注 | `SELECT` 模式下 `Ctrl` + 拖拽 |
| 移动标注 | 选中后拖拽 |
| 调整大小 | 选中后拖拽边缘控制点 |
| 平移画布 | `SELECT` 模式下拖拽空白区域 |
| 缩放画布 | 鼠标滚轮 |
| 自由绘制 | 画笔/马赛克/橡皮擦工具下按下拖拽 |
| 填充形状 | 填充工具下按下拖拽定义形状，松开即填充 |

---

## 典型用法

### 标注 + 绘图完整示例

```tsx
import { useRef, useState } from 'react'
import {
  AnnotationCanvas,
  ToolMode,
  type AnnotationCanvasRef,
  type AnnotationData,
  type DrawingData,
} from 'react-vision-annotator'

function AnnotationEditor({ imageUrl }: { imageUrl: string }) {
  const canvasRef = useRef<AnnotationCanvasRef>(null)
  const [tool, setTool] = useState(ToolMode.SELECT)
  const [color, setColor] = useState('#ff0000')
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSave = async () => {
    const annotationData = canvasRef.current?.export() ?? []
    const drawingData = canvasRef.current?.exportDrawingData()
    const drawingBlob = await canvasRef.current?.exportDrawingImage()

    // 保存到后端...
    console.log({ annotationData, drawingData, drawingBlob })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {/* 标注工具 */}
        <button onClick={() => setTool(ToolMode.SELECT)}>选择</button>
        <button onClick={() => setTool(ToolMode.DRAW_RECT)}>矩形</button>
        <button onClick={() => setTool(ToolMode.DRAW_CIRCLE)}>圆形</button>

        {/* 绘制工具 */}
        <button onClick={() => setTool(ToolMode.BRUSH_DRAW)}>画笔</button>
        <button onClick={() => setTool(ToolMode.MOSAIC_DRAW)}>马赛克</button>
        <button onClick={() => setTool(ToolMode.ERASER)}>橡皮擦</button>

        {/* 填充工具 */}
        <button onClick={() => setTool(ToolMode.BRUSH_FILL_RECT)}>画笔矩形填充</button>
        <button onClick={() => setTool(ToolMode.MOSAIC_FILL_RECT)}>马赛克矩形填充</button>
        <button onClick={() => setTool(ToolMode.MOSAIC_FILL_CIRCLE)}>马赛克圆形填充</button>

        {/* 颜色 */}
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />

        {/* 视口 */}
        <button onClick={() => canvasRef.current?.zoomIn()}>放大</button>
        <button onClick={() => canvasRef.current?.zoomOut()}>缩小</button>
        <button onClick={() => canvasRef.current?.reset()}>重置</button>

        {/* 编辑 */}
        <button onClick={() => canvasRef.current?.deleteSelected()}>删除选中</button>
        <button onClick={() => canvasRef.current?.clearDrawing()}>清除绘图</button>
        <button onClick={handleSave}>保存</button>
      </div>

      <div style={{ width: 800, height: 600 }}>
        <AnnotationCanvas
          ref={canvasRef}
          image={imageUrl}
          tool={tool}
          color={color}
          onChange={setAnnotations}
          onSelectionChange={setSelectedIds}
        />
      </div>

      <p>已选中 {selectedIds.length} 个标注，共 {annotations.length} 个</p>
    </div>
  )
}
```

### 复制粘贴标注

`onSelectionChange` 可用于在组件外跟踪选中状态，配合 `load()` 实现复制粘贴：

```tsx
const clipboardRef = useRef<AnnotationData[]>([])
const annotationsRef = useRef(annotations)
annotationsRef.current = annotations
const selectedIdsRef = useRef(selectedIds)
selectedIdsRef.current = selectedIds

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    if (e.key === 'c') {
      clipboardRef.current = annotationsRef.current
        .filter((a) => selectedIdsRef.current.includes(a.id))
    } else if (e.key === 'v' && clipboardRef.current.length > 0) {
      e.preventDefault()
      const offset = 10
      const pasted = clipboardRef.current.map((a, i) => ({
        ...a,
        id: `paste_${Date.now()}_${i}`,
        startPoint: { x: a.startPoint.x + offset, y: a.startPoint.y + offset },
        endPoint: { x: a.endPoint.x + offset, y: a.endPoint.y + offset },
      }))
      // 设置标志避免粘贴时弹出标签输入框
      canvasRef.current?.load([...annotationsRef.current, ...pasted])
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

### `onBeforeHistoryChange` 的用途

在撤销/重做触发 `onChange` **之前**调用，可用于抑制不必要的弹窗/副作用：

```tsx
const isProgrammatic = useRef(false)

const handleChange = (data: AnnotationData[]) => {
  if (isProgrammatic.current) {
    isProgrammatic.current = false
    setAnnotations(data)
    return
  }
  // 正常新建标注时，弹出标签输入框
  if (data.length > annotations.length) {
    openLabelModal(data[data.length - 1])
  }
  setAnnotations(data)
}

<AnnotationCanvas
  onBeforeHistoryChange={() => { isProgrammatic.current = true }}
  onChange={handleChange}
  ...
/>
```

### 导出合成图片

将图片与马赛克/画笔笔画合成为单张 PNG：

```tsx
const handleExport = async () => {
  const blob = await canvasRef.current?.exportDrawingImage()
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'annotated.png'
  a.click()
  URL.revokeObjectURL(url)
}
```

### 只读展示

```tsx
<AnnotationCanvas
  image={imageUrl}
  annotations={data}
  readOnly
/>
```

---

## 保存与恢复完整状态

标注数据（`AnnotationData[]`）和绘图数据（`DrawingData`）需分别保存：

```tsx
// 保存
const save = () => ({
  annotations: canvasRef.current?.export() ?? [],
  drawing: canvasRef.current?.exportDrawingData(),
})

// 恢复
const restore = (saved: ReturnType<typeof save>) => {
  canvasRef.current?.load(saved.annotations)
  if (saved.drawing) canvasRef.current?.loadDrawingData(saved.drawing)
}
```
