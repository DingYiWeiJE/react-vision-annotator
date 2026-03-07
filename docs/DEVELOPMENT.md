# react-vision-annotator 开发文档

## 项目概述

`react-vision-annotator` 是一个基于 React 18 + Konva.js 的图像标注 SDK，支持矩形和圆形标注、框选、拖拽、缩放等功能。

---

## 技术栈

| 用途     | 技术                              |
| -------- | --------------------------------- |
| 框架     | React 18 + TypeScript             |
| 渲染     | Konva.js + react-konva            |
| 构建     | tsup（ESM + CJS + DTS）           |
| 测试     | Vitest                            |
| 包管理   | pnpm                             |

---

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建

```bash
pnpm build
```

构建产物在 `dist/` 目录：

```
dist/
├── index.js       # CJS
├── index.mjs      # ESM
├── index.d.ts     # 类型声明
└── index.d.mts
```

### 3. 运行测试

```bash
pnpm test          # 单次运行
pnpm test:watch    # 监听模式
```

---

## 在本地 React 项目中调试 SDK

以下步骤可以让你在另一个本地 React 项目中实时测试 SDK，无需发布到 npm。

### 方法一：pnpm link（推荐）

**步骤 1：在 SDK 项目中注册全局 link**

```bash
# 在 react-vision-annotator 目录下
pnpm build
pnpm link --global
```

**步骤 2：在你的 React 项目中链接 SDK**

```bash
# 在你的前端项目目录下
pnpm link --global react-vision-annotator
```

**步骤 3：在代码中使用**

```tsx
import { AnnotationCanvas, ToolMode } from 'react-vision-annotator'
import type { AnnotationData } from 'react-vision-annotator'
```

**步骤 4：修改 SDK 后重新构建**

每次修改 SDK 代码后需要重新构建：

```bash
# 在 SDK 目录
pnpm build
```

前端项目会自动读取新的构建产物（可能需要重启 dev server）。

**解除链接：**

```bash
# 在前端项目目录
pnpm unlink react-vision-annotator

# 在 SDK 目录
pnpm unlink --global
```

### 方法二：本地路径依赖

在你的 React 项目的 `package.json` 中直接指向 SDK 目录：

```json
{
  "dependencies": {
    "react-vision-annotator": "file:../react-vision-annotator"
  }
}
```

然后执行：

```bash
pnpm install
```

> **注意：** 使用这种方式时，每次修改 SDK 都需要先 `pnpm build`，然后在前端项目中重新 `pnpm install`。

### 方法三：yarn link

如果你的前端项目使用 yarn：

```bash
# SDK 目录
pnpm build
yarn link

# 前端项目目录
yarn link react-vision-annotator
```

### 解决 React 重复实例问题

使用 link 时，SDK 和前端项目可能各自持有一份 React 实例，导致 hooks 报错。解决办法：

在你的前端项目的构建配置中，将 `react` 和 `react-dom` 指向同一份：

**Vite（vite.config.ts）：**

```ts
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
})
```

**Webpack（webpack.config.js）：**

```js
module.exports = {
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
}
```

---

## 项目结构

```
src/
├── core/                    # Core 层：纯 TypeScript，零框架依赖
│   ├── shapes/
│   │   ├── BaseShape.ts         # 抽象基类
│   │   ├── RectShape.ts         # 矩形
│   │   ├── CircleShape.ts       # 圆形
│   │   └── ShapeFactory.ts      # JSON → Shape 工厂
│   ├── annotation/
│   │   └── AnnotationManager.ts # 标注管理（CRUD + subscribe）
│   ├── selection/
│   │   └── SelectionManager.ts  # 选中 + 框选
│   ├── tools/
│   │   └── ToolController.ts    # ToolMode 枚举 + 工具切换
│   ├── history/
│   │   └── HistoryManager.ts    # Undo/Redo 快照栈
│   └── viewport/
│       └── ViewportController.ts # 缩放/平移/旋转
│
├── react/                   # React 层：渲染与交互
│   ├── hooks/
│   │   └── useAnnotationEngine.ts
│   ├── shapes/
│   │   ├── RectShapeView.tsx
│   │   └── CircleShapeView.tsx
│   └── components/
│       ├── AnnotationCanvas.tsx   # 顶层组件
│       ├── ImageLayer.tsx
│       ├── ShapeLayer.tsx
│       └── InteractionLayer.tsx
│
├── types/
│   └── annotation.ts        # 所有公共类型
│
└── index.ts                 # 唯一公共出口
```

### 架构规则

- **Core 层** 禁止引用 React / Konva，只处理纯业务逻辑
- **React 层** 只负责渲染和事件转发，不包含业务逻辑
- 所有坐标为**图像坐标**，鼠标事件须经 `ViewportController.screenToImage()` 转换

---

## 扩展新 Shape 类型

如需添加新的标注类型（如 Polygon），步骤：

1. **`src/types/annotation.ts`** — 在 `AnnotationData.type` 联合类型中添加新值
2. **`src/core/shapes/PolygonShape.ts`** — 继承 `BaseShape`，实现 `move()`、`contains()`、`getBounds()`、`toJSON()`
3. **`src/core/shapes/ShapeFactory.ts`** — 添加 `case 'polygon'`
4. **`src/react/shapes/PolygonShapeView.tsx`** — Konva 渲染组件
5. **`src/react/components/ShapeLayer.tsx`** — 添加渲染分支
