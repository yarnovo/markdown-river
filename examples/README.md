# Markdown River 示例项目

本目录包含了 Markdown River 的使用示例，展示了如何在不同环境中集成这个流式 Markdown 渲染器。

## 示例项目

### 1. React + Vite 示例

位置：`./react-vite/`

这个示例展示了如何在 React 应用中使用 Markdown River 的 Hook API。

**运行方法**：

```bash
cd react-vite
npm install
npm run dev
```

**特性**：

- 使用 `useMarkdownRiver` Hook
- 展示流式 AI 响应渲染
- 支持切换不同的解析策略
- 实时查看原始 HTML 输出

### 2. 原生 JavaScript + Parcel 示例

位置：`./js-parcel/`

这个示例展示了如何在纯 JavaScript 环境中使用 Markdown River。

**运行方法**：

```bash
cd js-parcel
npm install
npm run dev
```

**特性**：

- 原生 JavaScript API 使用
- 流式渲染演示
- 策略对比功能
- 交互式 Markdown 输入测试

## 核心功能演示

两个示例都展示了以下核心功能：

1. **流式渲染**：模拟 AI 逐字符返回 Markdown 文本的场景
2. **无闪烁体验**：格式符号不会先显示再消失
3. **策略切换**：对比标准策略和保守策略的差异
4. **实时解析**：展示 Markdown River 的实时处理能力

## 开发提示

在开发自己的应用时，请注意：

1. 确保先安装 `markdown-river` 依赖
2. 根据你的框架选择合适的集成方式（Hook 或直接使用类）
3. 配置合适的解析策略和 marked 选项
4. 监听 `content:parsed` 事件获取解析结果

更多详细信息，请参考项目的主 README 文档。
