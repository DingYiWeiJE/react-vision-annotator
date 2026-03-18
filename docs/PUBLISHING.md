# 发布到 npm 指南

## 前置条件

1. 注册 [npm 账号](https://www.npmjs.com/signup)
2. 本地登录 npm：
   ```bash
   npm login
   ```
3. 确认登录状态：
   ```bash
   npm whoami
   ```

## 发布流程

### 1. 确保代码就绪

```bash
# 确保在 main 分支，工作区干净
git checkout main
git pull
git status

# 运行测试
pnpm test

# 构建
pnpm build
```

### 2. 检查构建产物

确认 `dist/` 目录包含以下文件：
- `index.js`（CJS）
- `index.mjs`（ESM）
- `index.d.ts`（类型声明）

### 3. 预览发布内容

```bash
npm pack --dry-run
```

检查输出列表，应只包含 `dist/` 下的文件和 `package.json`。

### 4. 更新版本号

```bash
# 补丁版本 0.1.0 → 0.1.1
npm version patch

# 次版本 0.1.0 → 0.2.0
npm version minor

# 主版本 0.1.0 → 1.0.0
npm version major
```

`npm version` 会自动修改 `package.json` 并创建 git tag。

### 5. 发布

```bash
npm publish
```

首次发布如果包名被占用，可使用 scoped 包名：
```bash
# 修改 package.json 中 name 为 @your-scope/react-vision-annotator
# 然后以公开方式发布
npm publish --access public
```

### 6. 推送 tag

```bash
git push --follow-tags
```

## 发布预览版（可选）

开发中��版本可发布为 beta：

```bash
npm version 0.2.0-beta.0
npm publish --tag beta
```

用户安装时需指定 tag：
```bash
npm install react-vision-annotator@beta
```

## 检查清单

- [ ] 测试全部通过
- [ ] 构建无报错
- [ ] 版本号已更新
- [ ] `npm pack --dry-run` 内容正确（无多余文件）
- [ ] CHANGELOG 已更新（如有维护）
- [ ] git tag 已推送
