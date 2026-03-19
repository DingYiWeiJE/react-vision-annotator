# react-vision-annotator — Claude 项目指引

## 项目定位

一个 React 图像标注 SDK，发布为 npm 包（`react-vision-annotator`）。

完整设计见 `projectDesign.md`，实现新模块或有架构疑问时按需参考。

---

## 技术栈

| 用途 | 技术 |
| ---- | ---- |
| 框架 | React 18 + TypeScript |
| 渲染 | Konva.js + react-konva |
| 构建 | tsup |
| 测试 | Vitest + React Testing Library |
| 包管理 | pnpm |

---

## 架构约束（必须遵守）

```
Core 层（src/core/）
  - 纯 TypeScript，零框架依赖
  - 禁止 import React / Konva / 任何 UI 库

React 层（src/react/）
  - 负责渲染与事件，调用 Core 层
  - 不得包含业务逻辑
```

---

## 目录结构

```
src/
├─ core/
│   ├─ shapes/          # BaseShape, RectShape, CircleShape, ShapeFactory
│   ├─ annotation/      # AnnotationManager
│   ├─ selection/       # SelectionManager
│   ├─ tools/           # ToolController（ToolMode 枚举）
│   ├─ history/         # HistoryManager（Undo/Redo）
│   ├─ drawing/         # DrawingManager（马赛克/画笔/擦除管理）
│   └─ viewport/        # ViewportController
│
├─ react/
│   ├─ components/      # AnnotationCanvas, ImageLayer, ShapeLayer, InteractionLayer, DrawingLayer
│   ├─ shapes/          # RectShapeView, CircleShapeView
│   └─ hooks/           # useAnnotationEngine
│
├─ types/
│   └─ annotation.ts    # 所有公共类型（Point, AnnotationData, ViewportState, DrawingData, DrawingStroke...）
│
└─ index.ts             # 唯一公共出口
```

---

## 代码质量原则（每次写代码前必须遵守）

**抽象与封装**
- 重复超过 2 次的逻辑必须抽成函数或类方法，不允许复制粘贴
- 一个函数只做一件事，超过 30 行考虑拆分
- 不暴露内部实现细节，类的属性默认 `private`

**拒绝过度实现**
- 只实现当前需求，不为假设的未来需求写代码
- 不加没被要求的参数、配置项、fallback 逻辑

**可读性优先**
- 命名要自解释，不写"是什么"的注释，只写"为什么"
- 复杂逻辑先写清晰的代码，而不���先写注释���填代码

**禁止行为**
- 禁止 `any`，禁止 `@ts-ignore`
- 禁止一个函数同时处理多个关注点
- 禁止在 React 组件内写业务逻辑（调用 Core 层方法除外）

**命名与文件**
- 类型定义统一放 `src/types/annotation.ts`，禁止分散在各模块
- 组件文件用 PascalCase，工具/hook 文件用 camelCase
- 每个文件只导出一个主体（类或组件）

详细规范与示例见 `docs/CONVENTIONS.md`。

---

## 对外 API 出口（src/index.ts）

```ts
export { AnnotationCanvas }        from './react/components/AnnotationCanvas'
export { ToolMode }                from './core/tools/ToolController'
export type { AnnotationData }     from './types/annotation'
export type { DrawingData }        from './types/annotation'
export type { DrawingStroke }      from './types/annotation'
export type { AnnotationCanvasRef }from './react/components/AnnotationCanvas'
export type { ViewportState }      from './core/viewport/ViewportController'
```

只导出以上内容，内部实现不对外暴露。

---

## 关键行为约定

- **坐标系**：所有 Core 层接收的坐标均为**图像坐标**，鼠标事件坐标须经 `ViewportController.screenToImage()` 转换后再传入
- **AnnotationData**：仅存 `startPoint` / `endPoint`，`x/y/width/height/radius` 均为派生值，按需计算
- **状态通知**：Core 写操作后通过 `AnnotationManager.subscribe()` 回调通知 React 层重渲染
- **Undo/Redo**：每次写操作前由 `HistoryManager.push()` 保存快照

---

## 文档维护规则（代码变更时必须检查）

需求变更或代码变动时，按影响范围同步更新相对应文档：

| 变动类型 | 需要更新的文档 |
| -------- | -------------- |
| 架构约束、目录结构、对外 API 出口 | `CLAUDE.md` |
| 数据模型、核心接口、组件结构 | `projectDesign.md` |
| 编码规范新增或调整 | `docs/CONVENTIONS.md` |
| 项目结构、开发流程 | `docs/DEVELOPMENT.md` |
| 公共 API（Props / Ref / 类型 / 枚举） | `docs/USAGE.md` |
