# 流式 MARKDOWN 渲染器需求文档

## 项目背景

在开发 AI 聊天应用时，后端以流式方式返回 Markdown 格式的文本内容。使用传统的 Markdown 渲染框架（如 react-markdown）进行逐字符渲染时，会出现严重的视觉闪烁问题，影响用户体验。

## 核心问题

### 1. 视觉闪烁问题

当使用传统框架逐字符渲染 Markdown 时，会出现以下问题：

- **内联格式符号闪烁**：当遇到成对的格式符号（如 `**` 表示加粗）时，框架在接收到前两个星号时无法预知这是格式标记的开始，会将其作为普通字符显示
- **渲染状态突变**：当后续字符流入，框架识别出完整的格式标记后，会突然将之前显示的星号转换为格式化文本，造成明显的视觉跳变
- **用户体验差**：这种闪烁效果会让用户感到界面不稳定，降低应用的专业性

### 2. 渲染卡顿问题

简单的缓存策略会带来新的问题：

- **不确定性缓存**：当检测到可能的格式标记开始（如第一个 `*`）时，如果选择缓存等待，会导致渲染暂停
- **输出不连续**：缓存期间没有新内容输出，用户会感受到明显的卡顿
- **响应延迟**：等待确认格式标记完整性的过程会增加整体渲染延迟

## 功能需求

### 1. 流式解析能力

- 支持增量输入：能够接收逐字符或小块的 Markdown 文本输入
- 智能预测：能够识别潜在的格式标记并做出合理的渲染决策
- 状态维护：保持解析状态，支持跨多次输入的上下文理解

### 2. 平滑渲染输出

- **稳定的输出速率**：即使在处理复杂格式时也要保持稳定的渲染输出
- **无闪烁渲染**：避免格式符号的显示和隐藏切换
- **渐进式呈现**：内容应该平滑地出现在用户界面上

### 3. 格式支持

需要支持常见的 Markdown 格式：

- 内联格式：加粗（`**text**`）、斜体（`*text*`）、代码（`` `code` ``）、链接等
- 块级格式：标题、列表、引用块、代码块等
- 嵌套格式：支持格式的合理嵌套

### 4. 性能要求

- 低延迟：从接收输入到产生输出的延迟应该最小化
- 高效率：能够处理高频率的小块输入而不造成性能问题
- 内存友好：合理的内存使用，避免因长文本造成内存泄漏

### 5. 样式自定义

- **标签样式映射**：支持传入 Map 结构，将 HTML 标签映射到自定义的 CSS 类名
- **灵活的样式系统**：
  - 支持自定义 CSS 类名
  - 兼容 Tailwind CSS 等实用类框架
  - 允许为每种 Markdown 元素指定样式
- **示例配置**：
  ```javascript
  const styleMap = new Map([
    ['h1', 'text-4xl font-bold mb-4'],
    ['h2', 'text-3xl font-semibold mb-3'],
    ['p', 'text-base leading-relaxed mb-2'],
    ['strong', 'font-bold text-gray-900'],
    ['code', 'bg-gray-100 px-1 py-0.5 rounded'],
    ['blockquote', 'border-l-4 border-gray-300 pl-4 italic'],
  ]);
  ```

## 技术方案要求

### 1. 渲染机制

- 提供稳定的渲染输出接口
- 支持增量 DOM 更新，避免全量重渲染
- 实现平滑的过渡效果

### 2. 扩展性

- 模块化设计，便于添加新的 Markdown 格式支持
- 提供清晰的 API，便于集成到不同的前端框架
- 支持自定义渲染规则
- 样式系统可插拔，支持运行时动态修改样式映射

## 成功标准

1. **无闪烁**：在流式输入场景下，格式符号不会先显示后消失
2. **流畅性**：输出保持稳定的速率，没有明显的卡顿
3. **准确性**：最终渲染结果与完整输入后的渲染结果一致
4. **性能**：能够处理实时的 AI 响应流，延迟低于用户感知阈值

## 约束条件

- 需要支持主流浏览器环境
- 保持轻量级，避免引入过多依赖
- API 设计要简洁直观，降低使用门槛
