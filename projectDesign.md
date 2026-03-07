# 一、架构（React 专用）

简化为 **两层结构**：

```
Annotation SDK
│
├─ Core（业务核心）
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

| 层          | 职责       |
| ----------- | ---------- |
| Core        | 标注逻辑   |
| React Layer | 渲染与交互 |

核心原则：

```
所有业务逻辑在 Core
React 只负责 UI
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
│   │   └─ CircleShape.ts
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
│   └─ viewport
│       └─ ViewportController.ts
│
├─ react
│   ├─ components
│   │   ├─ AnnotationCanvas.tsx
│   │   ├─ ImageLayer.tsx
│   │   └─ ShapeLayer.tsx
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

```
export type AnnotationData = {
  id: string
  type: "rect" | "circle"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  color: string
  strokeWidth: number
}
```

示例：

```
{
 "id":"1",
 "type":"rect",
 "x":100,
 "y":120,
 "width":200,
 "height":150,
 "color":"#ff0000",
 "strokeWidth":2
}
```

后端 AI 返回：

```
bbox
↓
转换为 AnnotationData
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

BaseShape职责：

```
位置
样式
选中状态
拖拽逻辑
序列化
```

设计：

```
abstract class BaseShape {

 id: string
 color: string
 strokeWidth: number
 selected: boolean = false

 abstract move(dx:number,dy:number): void

 abstract contains(x:number,y:number): boolean

 abstract toJSON(): any

}
```

------

## RectShape

```
class RectShape extends BaseShape {

 x:number
 y:number
 width:number
 height:number

 move(dx,dy){
   this.x+=dx
   this.y+=dy
 }

}
```

------

## CircleShape

```
class CircleShape extends BaseShape {

 x:number
 y:number
 radius:number

}
```

------

# 五、AnnotationManager

负责：

```
管理所有标注
```

职责：

```
新增
删除
更新
JSON导入
JSON导出
```

接口：

```
class AnnotationManager {

 private shapes:BaseShape[]

 add(shape:BaseShape)

 remove(id:string)

 update(shape:BaseShape)

 getAll():BaseShape[]

 load(json)

 export()
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

判断规则：

```
shape.startPoint ∈ box
```

接口：

```
select(ids)

clear()

getSelected()

selectByBox(box)
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

```
enum ToolMode {

 SELECT,

 DRAW_RECT,

 DRAW_CIRCLE,

 BOX_SELECT

}
```

Controller：

```
class ToolController {

 mode:ToolMode

 setMode(mode)

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

状态：

```
scale
rotation
offset
```

接口：

```
zoomIn()

zoomOut()

rotate()

reset()
```

底层调用：

```
Konva Stage
```

------

# 九、React 渲染层

React组件结构：

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

------

# 十、AnnotationCanvas

核心组件：

```
<AnnotationCanvas
 image={url}
 annotations={data}
 tool="rect"
 strokeWidth={2}
 color="red"
 onChange={handle}
/>
```

职责：

```
创建Konva Stage
处理鼠标事件
更新AnnotationManager
```

------

# 十一、ShapeLayer

渲染 shapes：

```
annotationManager.getAll()
```

React 渲染：

```
map → ShapeView
```

------

# 十二、ShapeView（React组件）

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
hover
click
drag
```

------

# 十三、hover 高亮

hover 时：

```
strokeWidth + 1
color change
```

通过 React state 控制。

------

# 十四、拖拽修改位置

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

# 十五、JSON 渲染

后端返回：

```
annotations[]
```

SDK：

```
AnnotationManager.load()
```

React自动渲染。

------

# 十六、批量操作

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
```

------

# 十七、SDK对外 API

SDK导出：

```
AnnotationCanvas
ToolMode
```

示例：

```
import {
 AnnotationCanvas,
 ToolMode
} from "react-annotation-sdk"
```

------

# 十八、未来扩展能力

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

渲染组件：

```
PolygonShapeView
```

