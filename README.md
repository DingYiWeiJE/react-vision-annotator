# react-vision-annotator

一个基于 React + Konva.js 的图像标注库，专门为图像标注场景打造。支持矩形/圆形标注、涂鸦/马赛克、撤销重做、缩放旋转等功能。

## 快速开始

### 安装

```bash
npm install react-vision-annotator konva react-konva
```

> 注意：需要同时安装 `konva` 和 `react-konva` 作为依赖。

### 基础用法

```tsx
import { AnnotationCanvas, ToolMode } from 'react-vision-annotator'
import { useState } from 'react'

function App() {
  const [annotations, setAnnotations] = useState([])
  const [tool, setTool] = useState(ToolMode.RECT)

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <AnnotationCanvas
        image="/path/to/your/image.jpg"
        tool={tool}
        annotations={annotations}
        onChange={setAnnotations}
        color="#ff0000"
        strokeWidth={2}
      />
    </div>
  )
}
```

## 主要功能

### 标注工具

支持以下几种工具模式：

```tsx
import { ToolMode } from 'react-vision-annotator'

// 选择模式（可框选、移动、调整大小）
ToolMode.SELECT

// 矩形标注
ToolMode.RECT

// 圆形标注
ToolMode.CIRCLE

// 画笔涂鸦
ToolMode.BRUSH_DRAW

// 马赛克（自由绘制）
ToolMode.MOSAIC_DRAW

// 马赛克矩形填充
ToolMode.MOSAIC_FILL_RECT

// 马赛克圆形填充
ToolMode.MOSAIC_FILL_CIRCLE

// 画笔矩形填充
ToolMode.BRUSH_FILL_RECT

// 画笔圆形填充
ToolMode.BRUSH_FILL_CIRCLE

// 橡皮擦
ToolMode.ERASER

// 平移画布
ToolMode.PAN

// 移动标注
ToolMode.MOVE_ANNOTATION
```

### 键盘快捷键

- **空格键 + 鼠标拖动**：平移画布
- **Ctrl + 鼠标拖动**：移动标注框（在 SELECT 模式下）
- **鼠标滚轮**：缩放画布

### 命令式 API

通过 `ref` 可以调用更多方法：

```tsx
import { useRef } from 'react'
import { AnnotationCanvas, AnnotationCanvasRef } from 'react-vision-annotator'

function App() {
  const canvasRef = useRef<AnnotationCanvasRef>(null)

  const handleZoomIn = () => {
    canvasRef.current?.zoomIn()
  }

  const handleExport = () => {
    const data = canvasRef.current?.export()
    console.log('导出的标注数据：', data)
  }

  return (
    <AnnotationCanvas
      ref={canvasRef}
      image="/path/to/image.jpg"
    />
  )
}
```

#### 可用方法

```tsx
// 加载标注数据
canvasRef.current.load(annotations)

// 导出标注数据
const data = canvasRef.current.export()

// 获取当前选中的标注
const selected = canvasRef.current.getSelected()

// 缩放
canvasRef.current.zoomIn()
canvasRef.current.zoomOut()

// 旋转（单位：度）
canvasRef.current.rotate(90)

// 重置视图
canvasRef.current.reset()

// 清除选择
canvasRef.current.clearSelection()

// 删除选中的标注
canvasRef.current.deleteSelected()

// 选中指定标注
canvasRef.current.select(['id1', 'id2'])

// 聚焦到某个标注
canvasRef.current.focusOn('annotation-id')

// 导出绘图图层为图片
const blob = await canvasRef.current.exportDrawingImage()

// 导出绘图数据
const drawingData = canvasRef.current.exportDrawingData()

// 加载绘图数据
canvasRef.current.loadDrawingData(drawingData)

// 清空绘图
canvasRef.current.clearDrawing()

// 获取图片尺寸
const size = canvasRef.current.getImageSize()

// 控制图层显示/隐藏
canvasRef.current.setAnnotationLayerVisibility(false)
canvasRef.current.setDrawingLayerVisibility(false)
```

## Props 配置

### AnnotationCanvas 完整属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `image` | `string` | **必填** | 图片 URL |
| `annotations` | `AnnotationData[]` | `[]` | 初始标注数据 |
| `tool` | `ToolMode` | `ToolMode.SELECT` | 当前工具 |
| `color` | `string` | `#ff0000` | 标注颜色 |
| `strokeWidth` | `number` | `2` | 标注线宽 |
| `readOnly` | `boolean` | `false` | 只读模式 |
| `onChange` | `(data: AnnotationData[]) => void` | - | 标注数据变化回调 |
| `onSelectionChange` | `(ids: string[]) => void` | - | 选中状态变化回调 |
| `onBeforeHistoryChange` | `() => void` | - | 撤销/重做前的回调 |
| `drawingData` | `DrawingData` | - | 绘图数据（马赛克/画笔） |
| `onDrawingChange` | `(data: DrawingData) => void` | - | 绘图数据变化回调 |
| `mosaicPixelSize` | `number` | `10` | 马赛克像素大小 |
| `mosaicBrushSize` | `number` | `20` | 马赛克笔刷大小 |
| `brushSize` | `number` | `4` | 画笔大小 |
| `eraserSize` | `number` | `20` | 橡皮擦大小 |
| `shortcutRadius` | `number` | `40` | 快捷操作半径 |
| `onImageSizeChange` | `(size: {width: number, height: number}) => void` | - | 图片尺寸变化回调 |

## 数据结构

### AnnotationData

```typescript
interface AnnotationData {
  id: string                        // 唯一标识
  type: 'rectangle' | 'circle'      // 标注类型
  startPoint: { x: number, y: number }  // 起点
  endPoint: { x: number, y: number }    // 终点
  label?: string                    // 标签
  color: string                     // 颜色
  strokeWidth: number               // 线宽
  visible?: boolean                 // 是否可见
  error?: boolean                   // 是否标记为错误
}
```

### DrawingData

```typescript
interface DrawingData {
  strokes: DrawingStroke[]  // 笔画数组
  mosaicPixelSize: number   // 马赛克像素大小
}

interface DrawingStroke {
  id: string
  type: 'mosaic' | 'brush' | 'erase'
  points: number[]          // 坐标点数组 [x1, y1, x2, y2, ...]
  brushSize: number
  color?: string
  fillShape?: 'rectangle' | 'circle'  // 填充形状
}
```

## 实用场景

### 场景 1：图片标注工具

```tsx
function ImageAnnotator() {
  const [annotations, setAnnotations] = useState([])
  const [tool, setTool] = useState(ToolMode.RECT)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: 8 }}>
        <button onClick={() => setTool(ToolMode.SELECT)}>选择</button>
        <button onClick={() => setTool(ToolMode.RECT)}>矩形</button>
        <button onClick={() => setTool(ToolMode.CIRCLE)}>圆形</button>
      </div>
      <div style={{ height: 'calc(100vh - 60px)' }}>
        <AnnotationCanvas
          image="/image.jpg"
          tool={tool}
          annotations={annotations}
          onChange={setAnnotations}
        />
      </div>
    </div>
  )
}
```

### 场景 2：带马赛克的图片编辑器

```tsx
function ImageEditor() {
  const [tool, setTool] = useState(ToolMode.MOSAIC_DRAW)
  const [drawingData, setDrawingData] = useState({ strokes: [], mosaicPixelSize: 10 })
  const canvasRef = useRef(null)

  const handleExport = async () => {
    const blob = await canvasRef.current?.exportDrawingImage()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'image-with-mosaic.png'
      a.click()
    }
  }

  return (
    <div>
      <button onClick={handleExport}>导出图片</button>
      <AnnotationCanvas
        ref={canvasRef}
        image="/image.jpg"
        tool={tool}
        drawingData={drawingData}
        onDrawingChange={setDrawingData}
        mosaicPixelSize={15}
      />
    </div>
  )
}
```

### 场景 3：只读预览模式

```tsx
function AnnotationViewer({ imageUrl, annotations }) {
  return (
    <AnnotationCanvas
      image={imageUrl}
      annotations={annotations}
      readOnly={true}
    />
  )
}
```

## 开发相关

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test
```

### 项目结构

```
src/
├── core/              # 核心逻辑（与框架无关）
│   ├── annotation/    # 标注管理
│   ├── drawing/       # 绘图管理
│   ├── history/       # 历史记录（撤销/重做）
│   ├── selection/     # 选择管理
│   ├── shapes/        # 形状定义
│   ├── tools/         # 工具控制
│   └── viewport/      # 视口控制
├── react/             # React 组件层
│   ├── components/    # 组件
│   ├── hooks/         # Hooks
│   └── shapes/        # 形状视图
└── types/             # TypeScript 类型定义
```

## 技术栈

- **React 18+**：UI 框架
- **Konva.js**：Canvas 渲染引擎
- **TypeScript**：类型安全
- **tsup**：打包工具

## License

MIT

---

有问题或建议？欢迎提 issue 或 PR。
