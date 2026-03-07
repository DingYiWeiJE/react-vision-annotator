# react-vision-annotator 使用文档

React 图像标注组件，支持矩形/圆形标注、框选、拖拽移动、缩放、撤销重做。

---

## 安装

```bash
# npm
npm install react-vision-annotator

# yarn
yarn add react-vision-annotator

# pnpm
pnpm add react-vision-annotator
```

**前置依赖：** 你的项目需要安装 React 18：

```bash
npm install react react-dom
```

---

## 快速开始

```tsx
import { AnnotationCanvas, ToolMode } from 'react-vision-annotator'

function App() {
  return (
    <AnnotationCanvas
      image="https://example.com/photo.jpg"
      tool={ToolMode.DRAW_RECT}
      onChange={(annotations) => console.log(annotations)}
    />
  )
}
```

---

## 完整 Demo

以下示例展示了所有核心功能：工具切换、标注增删、导入导出、缩放旋转、撤销重做。

```tsx
import { useRef, useState } from 'react'
import {
  AnnotationCanvas,
  ToolMode,
} from 'react-vision-annotator'
import type { AnnotationData, AnnotationCanvasRef } from 'react-vision-annotator'

function App() {
  const canvasRef = useRef<AnnotationCanvasRef>(null)
  const [tool, setTool] = useState(ToolMode.SELECT)
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])

  const handleChange = (data: AnnotationData[]) => {
    setAnnotations(data)
    console.log('标注变更:', data)
  }

  // 从后端加载标注
  const handleLoad = () => {
    const mockData: AnnotationData[] = [
      {
        id: '1',
        type: 'rect',
        startPoint: { x: 50, y: 50 },
        endPoint: { x: 200, y: 150 },
        label: 'cat',
        color: '#ff0000',
        strokeWidth: 2,
      },
      {
        id: '2',
        type: 'circle',
        startPoint: { x: 400, y: 300 },
        endPoint: { x: 450, y: 300 },
        label: 'wheel',
        color: '#00ff00',
        strokeWidth: 2,
      },
    ]
    canvasRef.current?.load(mockData)
  }

  // 导出标注 JSON
  const handleExport = () => {
    const data = canvasRef.current?.export()
    console.log('导出结果:', JSON.stringify(data, null, 2))
  }

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTool(ToolMode.SELECT)}
          style={{ fontWeight: tool === ToolMode.SELECT ? 'bold' : 'normal' }}
        >
          选择
        </button>
        <button
          onClick={() => setTool(ToolMode.DRAW_RECT)}
          style={{ fontWeight: tool === ToolMode.DRAW_RECT ? 'bold' : 'normal' }}
        >
          画矩形
        </button>
        <button
          onClick={() => setTool(ToolMode.DRAW_CIRCLE)}
          style={{ fontWeight: tool === ToolMode.DRAW_CIRCLE ? 'bold' : 'normal' }}
        >
          画圆形
        </button>
        <button
          onClick={() => setTool(ToolMode.BOX_SELECT)}
          style={{ fontWeight: tool === ToolMode.BOX_SELECT ? 'bold' : 'normal' }}
        >
          框选
        </button>

        <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />

        <button onClick={() => canvasRef.current?.zoomIn()}>放大</button>
        <button onClick={() => canvasRef.current?.zoomOut()}>缩小</button>
        <button onClick={() => canvasRef.current?.rotate(90)}>旋转 90°</button>
        <button onClick={() => canvasRef.current?.reset()}>重置视图</button>

        <span style={{ borderLeft: '1px solid #ccc', margin: '0 4px' }} />

        <button onClick={handleLoad}>加载标注</button>
        <button onClick={handleExport}>导出 JSON</button>
        <button onClick={() => canvasRef.current?.deleteSelected()}>删除选中</button>
        <button onClick={() => canvasRef.current?.clearSelection()}>清除选择</button>
      </div>

      {/* 标注画布 */}
      <AnnotationCanvas
        ref={canvasRef}
        image="https://example.com/photo.jpg"
        tool={tool}
        color="#ff0000"
        strokeWidth={2}
        width={800}
        height={600}
        onChange={handleChange}
      />

      {/* 标注列表 */}
      <div style={{ marginTop: 12 }}>
        <h3>当前标注 ({annotations.length})</h3>
        <pre style={{ background: '#f5f5f5', padding: 12, fontSize: 12 }}>
          {JSON.stringify(annotations, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default App
```

---

## API 参考

### `<AnnotationCanvas>` Props

| 属性          | 类型                                    | 默认值       | 说明               |
| ------------- | --------------------------------------- | ------------ | ------------------ |
| `image`       | `string`                                | **必填**     | 图片 URL           |
| `annotations` | `AnnotationData[]`                      | `[]`         | 初始标注数据       |
| `tool`        | `ToolMode`                              | `SELECT`     | 当前工具模式       |
| `color`       | `string`                                | `'#ff0000'`  | 新标注颜色         |
| `strokeWidth` | `number`                                | `2`          | 新标注线宽         |
| `readOnly`    | `boolean`                               | `false`      | 只读模式           |
| `width`       | `number`                                | `800`        | 画布宽度           |
| `height`      | `number`                                | `600`        | 画布高度           |
| `onChange`     | `(annotations: AnnotationData[]) => void` | —          | 标注变更回调       |

### `AnnotationCanvasRef` 方法

通过 `ref` 调用：

```tsx
const canvasRef = useRef<AnnotationCanvasRef>(null)
canvasRef.current?.zoomIn()
```

| 方法               | 说明                     |
| ------------------ | ------------------------ |
| `load(data)`       | 加载标注数据             |
| `export()`         | 导出当前所有标注为 JSON  |
| `zoomIn()`         | 放大                     |
| `zoomOut()`        | 缩小                     |
| `rotate(deg)`      | 旋转指定角度             |
| `reset()`          | 重置视图（缩放/旋转/平移） |
| `clearSelection()` | 清除选中状态             |
| `deleteSelected()` | 删除当前选中的标注       |

### `ToolMode` 枚举

| 值            | 说明         |
| ------------- | ------------ |
| `SELECT`      | 选择模式：点击选中、拖拽移动 |
| `DRAW_RECT`   | 绘制矩形     |
| `DRAW_CIRCLE` | 绘制圆形     |
| `BOX_SELECT`  | 框选模式     |

### `AnnotationData` 类型

```ts
interface AnnotationData {
  id: string                   // 唯一标识
  type: 'rect' | 'circle'     // 标注类型
  startPoint: { x: number; y: number }  // 起始点
  endPoint: { x: number; y: number }    // 结束点
  label?: string               // 标签名称
  color: string                // 颜色
  strokeWidth: number          // 线宽
  visible?: boolean            // 是否可见，默认 true
}
```

**坐标说明：**

| 类型   | startPoint     | endPoint             |
| ------ | -------------- | -------------------- |
| 矩形   | 左上角区域起点 | 右下角区域终点       |
| 圆形   | 圆心           | 圆周上的一点         |

---

## 键盘快捷键

| 快捷键                | 功能         |
| --------------------- | ------------ |
| `Delete` / `Backspace`| 删除选中标注 |
| `Escape`              | 取消选中 / 退出绘制 |
| `Ctrl+Z`              | 撤销         |
| `Ctrl+Y`              | 重做         |

---

## 交互操作

| 操作           | 说明                             |
| -------------- | -------------------------------- |
| 绘制           | 选择绘制工具后，鼠标按下拖拽释放 |
| 选中           | SELECT 模式下点击标注            |
| 移动           | 选中后拖拽标注                   |
| 缩放调整       | 选中后拖拽边缘控制点             |
| 框选           | BOX_SELECT 模式下拖拽框选区域    |
| 悬停高亮       | 鼠标移到标注上时高亮显示         |

---

## 与后端集成

典型流程：

```tsx
// 1. 从后端获取标注数据
const response = await fetch('/api/annotations')
const data: AnnotationData[] = await response.json()

// 2. 加载到画布
canvasRef.current?.load(data)

// 3. 用户编辑后保存
const handleSave = () => {
  const result = canvasRef.current?.export()
  fetch('/api/annotations', {
    method: 'POST',
    body: JSON.stringify(result),
  })
}
```

---

## 只读模式

用于纯展示场景，禁止绘制和编辑：

```tsx
<AnnotationCanvas
  image={imageUrl}
  annotations={data}
  readOnly
/>
```
