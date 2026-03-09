# 马赛克功能需求文档

## 概述

为图像标注 SDK 添加马赛克（像素化）功能，支持画笔式绘制和擦除。

## 业务流程

### 绘制时
1. 用户选择马赛克画笔工具，在图片上自由绘制
2. 绘制区域实时显示马赛克（像素化）效果
3. 用户可切换为马赛克擦除工具，擦除已绘制区域的一部分

### 保存时
1. SDK 根据原图 + 马赛克笔画数据，合成一张带马赛克的真实图片（Blob）
2. 调用方上传两份数据到后端：
   - 合成后的马赛克图片文件
   - 马赛克标注数据（JSON，用于下次编辑）

### 加载时
1. 从后端获取**原图** + **马赛克标注数据**
2. SDK 加载原图，根据标注数据还原马赛克绘制状态
3. 用户可继续编辑（画/擦）

## 数据模型

```typescript
interface MosaicStroke {
  id: string
  type: 'draw' | 'erase'
  points: number[]       // 扁平数组 [x1,y1,x2,y2,...] 画笔经过的点
  brushSize: number      // 画笔/橡皮擦直径（图像像素）
}

interface MosaicData {
  strokes: MosaicStroke[]
  pixelSize: number       // 马赛克块大小（图像像素）
}
```

## 工具模式

- `MOSAIC_DRAW`：马赛克画笔
- `MOSAIC_ERASE`：马赛克橡皮擦

## 渲染方案

使用 offscreen canvas 实现马赛克渲染：
1. 根据所有 draw 笔画生成覆盖 mask
2. 从 mask 中减去所有 erase 笔画区域
3. 对 mask 覆盖的原图区域进行像素化处理
4. 将结果作为 Konva.Image 渲染在图片层和标注层之间

## 导出方案

`exportMosaicImage()` 方法：
1. 创建与原图同尺寸的 offscreen canvas
2. 绘制原图
3. 应用马赛克效果到对应区域
4. `canvas.toBlob()` 返回图片文件

## API 变更

### Props 新增
- `mosaicData?: MosaicData` — 初始马赛克数据
- `mosaicPixelSize?: number` — 马赛克块大小，默认 10
- `mosaicBrushSize?: number` — 画笔大小，默认 20

### Ref 方法新增
- `exportMosaicImage(): Promise<Blob | null>` — 导出带马赛克的图片
- `exportMosaicData(): MosaicData` — 导出马赛克标注数据

### onChange 回调
- `onMosaicChange?: (data: MosaicData) => void` — 马赛克数据变更回调
