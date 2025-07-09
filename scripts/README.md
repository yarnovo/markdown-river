# Scripts 目录说明

## 目录结构

```
scripts/
├── README.md              # 本说明文件
├── copy-dist-to-demo.js   # 复制 dist 到 demo/static 的脚本
├── demo-watch.js          # demo 开发模式的热更新脚本
└── tests/                 # 测试脚本目录
    └── test-watch.js      # 文件监听机制测试脚本
```

## 正式脚本

### copy-dist-to-demo.js

- **功能**：将 `dist` 目录复制到 `demo/static`
- **用途**：构建后复制产物到演示目录
- **调用方式**：`npm run copy-dist`

### demo-watch.js

- **功能**：demo 开发模式的热更新脚本
- **用途**：监听 `src` 目录变化，自动构建并复制到 demo
- **调用方式**：`npm run demo:watch`
- **特性**：
  - 统一监听机制，只监听 `src` 目录
  - 防抖机制，避免频繁触发
  - 进程管理，确保构建进程正确启动和终止
  - 自动启动开发服务器

## 测试脚本

### tests/test-watch.js

- **功能**：测试文件监听机制
- **用途**：验证文件变化监听和自动构建功能
- **调用方式**：`node scripts/tests/test-watch.js`
- **特性**：
  - 同时监听 `src` 和 `dist` 目录
  - 详细的日志输出
  - 手动测试文件变化触发

## 使用说明

### 正常开发

```bash
# 启动 demo 开发模式（推荐）
npm run demo:watch

# 手动构建和复制
npm run demo
```

### 测试调试

```bash
# 测试文件监听机制
node scripts/tests/test-watch.js

# 按 Ctrl+C 停止测试
```

## 注意事项

1. **目录权限**：确保所有脚本都有执行权限
2. **路径依赖**：测试脚本使用相对路径，移动时需要更新路径
3. **进程管理**：使用 Ctrl+C 优雅退出，避免遗留进程
4. **依赖检查**：确保 chokidar、concurrently 等依赖已安装
