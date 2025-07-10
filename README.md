# Markdown River

一个高性能的流式 Markdown 渲染器，支持增量解析和实时渲染，类似于 ChatGPT 的实时 Markdown 渲染效果。

## 特性

- 🚀 **流式渲染** - 支持逐字符输入，实时显示渲染结果
- ⚡ **增量解析** - 无需等待完整文档，基于当前输入立即解析
- 🎯 **智能缓冲** - 自动处理歧义字符，优化渲染时机
- 📊 **性能监控** - 内置性能监控，自适应优化参数
- 🔧 **模块化设计** - 清晰的模块划分，易于扩展和维护
- 🎨 **优雅降级** - 智能错误修正，保证渲染质量

## 安装

```bash
npm install markdown-river
```

## 快速开始

```javascript
import { StreamingMarkdownRenderer } from 'markdown-river';

// 创建渲染器实例
const container = document.getElementById('markdown-container');
const renderer = new StreamingMarkdownRenderer(container, {
  bufferTimeout: 50, // 缓冲区超时时间（毫秒）
  renderBatchSize: 10, // 批量渲染大小
  enableMetrics: true, // 启用性能监控
  syntaxHighlight: true, // 启用语法高亮
});

// 流式输入文本
renderer.write('# Hello World\n');
renderer.write('This is **streaming** ');
renderer.write('Markdown *rendering*!');

// 结束输入
renderer.end();

// 监听性能报告
renderer.on('monitor:report', report => {
  console.log('Performance:', report);
});

// 清理资源
renderer.destroy();
```

## API 文档

### StreamingMarkdownRenderer

主渲染器类，负责协调各个模块完成流式渲染。

#### 构造函数

```typescript
new StreamingMarkdownRenderer(container: HTMLElement, options?: RendererOptions)
```

#### 选项

| 选项            | 类型    | 默认值 | 描述                   |
| --------------- | ------- | ------ | ---------------------- |
| bufferTimeout   | number  | 50     | 缓冲区超时时间（毫秒） |
| renderBatchSize | number  | 10     | 每批渲染的最大事件数   |
| enableMetrics   | boolean | true   | 是否启用性能监控       |
| syntaxHighlight | boolean | true   | 是否启用语法高亮       |
| virtualScroll   | boolean | false  | 是否启用虚拟滚动       |

#### 方法

- `write(chunk: string): void` - 写入文本块
- `end(): void` - 结束输入流
- `destroy(): void` - 销毁渲染器，释放资源
- `on(event: string, handler: Function): void` - 监听事件
- `off(event: string, handler: Function): void` - 取消监听
- `getMetrics(): PerformanceMetrics | undefined` - 获取性能指标

## 支持的 Markdown 语法

### 必须支持（P0）

- 标题（`# ~ ######`）
- 粗体（`**text**` 或 `__text__`）
- 斜体（`*text*` 或 `_text_`）
- 行内代码（`` `code` ``）
- 代码块（` ```language `）
- 无序列表（`-` 或 `*`）
- 有序列表（`1. 2. 3.`）
- 段落和换行

### 建议支持（P1）

- 引用（`> quote`）
- 链接（`[text](url)`）
- 图片（`![alt](url)`）
- 分隔线（`---`）
- 删除线（`~~text~~`）

### 可选支持（P2）

- 表格
- 任务列表
- 嵌套列表

## 性能优化

- 批量 DOM 操作，减少重排
- 对象池复用 DOM 元素
- RequestAnimationFrame 调度渲染
- 智能缓冲策略，平衡延迟和准确性
- 可选的虚拟滚动支持

## 示例

查看 `demo/` 目录下的完整示例：

```bash
# 启动开发服务器（端口 3000）
npm run demo

# 或者启动带自动重新构建的开发服务器（支持热重载）
npm run demo:watch
```

然后在浏览器中访问 http://localhost:3000

**注意**：demo 会自动将构建后的文件复制到 `demo/static` 目录，该目录已被 gitignore 忽略。

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 代码检查
npm run lint
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

ISC License
