# Markdown River 示例项目

这个目录包含了展示如何使用 Markdown River 的示例项目：

- **react-vite**: React + Vite 示例，展示如何使用 React Hook
- **js-parcel**: 原生 JavaScript + Parcel 示例，展示基础 API 用法

## 开发说明

### 依赖管理

示例项目使用 `npm link` 来引用主项目，而不是 `file:../..`。这样做的好处：

1. **避免缓存问题**：修改主项目代码后，无需删除 node_modules
2. **实时更新**：重新构建主项目后，示例自动使用最新版本
3. **开发效率**：配合 `npm run build:watch` 可以实时查看更改

### 初始设置

如果你刚克隆仓库，运行：

```bash
# 在根目录
npm run dev:setup
```

这会自动：

1. 构建主项目
2. 创建 npm link
3. 在示例项目中链接主项目

### 日常开发流程

1. **修改核心库代码**
2. **在根目录运行**：
   ```bash
   npm run build
   # 或使用监听模式
   npm run build:watch
   ```
3. **示例项目会自动使用最新构建**

### 常见问题

**Q: 为什么不使用 `file:../..`？**

A: 使用相对路径会有缓存问题，每次更新都需要删除 node_modules 重装，非常麻烦。

**Q: 如何清理并重新设置？**

```bash
# 清理
rm -rf node_modules examples/*/node_modules

# 重新设置
npm install
npm run dev:setup
```

**Q: 发布前需要做什么？**

发布前需要将 package.json 中的依赖改为真实版本号，而不是 link。
