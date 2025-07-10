# Markdown River

一个专门解决 AI 聊天应用中 Markdown 流式渲染闪烁问题的前端库。通过智能缓冲策略，实现平滑无闪烁的实时 Markdown 渲染效果。

## 特性

- 🚀 **流式渲染** - 支持逐字符输入，实时显示渲染结果
- ⚡ **无闪烁体验** - 智能缓冲避免格式符号的视觉跳变
- 🎯 **简单可靠** - 基于成熟的 marked 库，无需重新造轮子
- 📦 **轻量级** - 最小化依赖，仅使用 marked + html-react-parser + mitt
- 🔧 **框架无关** - 通过事件系统解耦，支持任何前端框架
- ⚛️ **React 优化** - 充分利用 React 的 diff 算法优化渲染

## 安装

```bash
npm install markdown-river
# 或
yarn add markdown-river
# 或
pnpm add markdown-river
```

## 开发环境设置

如果你要开发或测试 Markdown River，请按以下步骤设置：

```bash
# 1. 克隆仓库
git clone https://github.com/yarnovo/markdown-river.git
cd markdown-river

# 2. 安装依赖
npm install

# 3. 设置开发环境（使用 npm link）
npm run dev:setup

# 4. 启动构建监听（可选）
npm run build:watch
```

**为什么使用 npm link？**

- 示例项目会实时使用最新的构建结果
- 无需手动更新 node_modules
- 避免 `file:../..` 相对路径的缓存问题

详细说明请查看 [开发环境设置文档](./docs/development-setup.md)。

## 快速开始

### 基础用法

```javascript
import { MarkdownRiver } from 'markdown-river';

// 创建渲染器实例
const river = new MarkdownRiver({
  bufferTimeout: 50, // 时间阈值（毫秒）
  bufferSize: 20, // 字符数阈值
});

// 监听解析完成事件
river.on('content:parsed', ({ html }) => {
  document.getElementById('output').innerHTML = html;
});

// 流式输入文本
river.write('# Hello World\n');
river.write('This is **streaming** ');
river.write('Markdown *rendering*!');

// 结束输入
river.end();
```

### React 集成

```jsx
import { useMarkdownRiver } from 'markdown-river/react';

function ChatMessage() {
  const { write, end, content } = useMarkdownRiver({
    bufferTimeout: 50,
    bufferSize: 20,
  });

  useEffect(() => {
    // 模拟流式输入
    const chunks = ['# Hello\n', 'This is **bold** and ', '*italic* text.'];
    chunks.forEach((chunk, i) => {
      setTimeout(() => write(chunk), i * 100);
    });
    setTimeout(() => end(), chunks.length * 100);
  }, []);

  return <div className="markdown-content">{content}</div>;
}
```

## API 文档

### MarkdownRiver

主渲染器类，负责缓冲管理和 Markdown 解析。

#### 构造函数

```typescript
new MarkdownRiver(options?: MarkdownRiverOptions)
```

#### 配置选项

| 选项            | 类型            | 默认值 | 描述                 |
| --------------- | --------------- | ------ | -------------------- |
| `bufferTimeout` | `number`        | `50`   | 缓冲超时时间（毫秒） |
| `bufferSize`    | `number`        | `20`   | 缓冲区字符数阈值     |
| `markedOptions` | `MarkedOptions` | `{}`   | marked 库的配置选项  |

#### 方法

- `write(chunk: string): void` - 写入文本块
- `end(): void` - 结束输入流
- `on(event: string, handler: Function): void` - 监听事件
- `off(event: string, handler: Function): void` - 取消监听
- `destroy(): void` - 销毁实例，清理资源

#### 事件

##### `content:parsed`

当内容解析完成时触发。

```typescript
interface ContentParsedEvent {
  html: string; // 解析后的 HTML
  timestamp: number; // 时间戳
  chunkIndex: number; // 第几次解析
}
```

##### `buffer:status`

缓冲区状态变化时触发。

```typescript
interface BufferStatusEvent {
  buffering: boolean; // 是否正在缓冲
  size: number; // 当前缓冲区大小
  reason?: 'timeout' | 'size' | 'end'; // 触发原因
}
```

### React Hook: useMarkdownRiver

```typescript
function useMarkdownRiver(options?: MarkdownRiverOptions): {
  write: (chunk: string) => void;
  end: () => void;
  content: React.ReactNode; // 优化过的 React 组件
  rawHtml: string; // 原始 HTML 字符串
};
```

## 缓冲策略

### 双阈值判断

渲染器使用时间和字符数双重阈值来决定何时触发渲染：

1. **时间阈值**：当距离上次输入超过指定时间（默认 50ms）时触发
2. **字符数阈值**：当缓冲区累积字符数超过指定数量（默认 20 个）时触发

两个条件满足其一即会触发渲染，确保既有良好的实时性，又能有效避免闪烁。

### 为什么需要缓冲？

在流式渲染场景下，如果逐字符立即渲染，会出现以下问题：

```
输入: *italic*
逐字符渲染过程:
1. * → 显示 "*"
2. *i → 显示 "*i"
3. *it → 显示 "*it"
...
7. *italic* → 突然变成斜体 "italic"
```

用户会看到星号先出现后消失的闪烁现象。通过智能缓冲，我们能够：

- 让 marked 一次性识别完整的格式标记
- 避免中间状态的渲染
- 保持流畅的输出体验

## 高级用法

### 自定义 marked 配置

```javascript
const river = new MarkdownRiver({
  markedOptions: {
    gfm: true, // GitHub Flavored Markdown
    breaks: true, // 支持换行
    highlight: (code, lang) => {
      // 自定义代码高亮
      return hljs.highlight(code, { language: lang }).value;
    },
  },
});
```

### 性能监控

```javascript
river.on('buffer:status', ({ buffering, size, reason }) => {
  console.log(`Buffer status: ${buffering ? 'buffering' : 'flushed'}`);
  console.log(`Buffer size: ${size}`);
  if (reason) {
    console.log(`Trigger reason: ${reason}`);
  }
});
```

### TypeScript 支持

```typescript
import { MarkdownRiver, MarkdownRiverOptions, ContentParsedEvent } from 'markdown-river';

const options: MarkdownRiverOptions = {
  bufferTimeout: 30,
  bufferSize: 15,
};

const river = new MarkdownRiver(options);

river.on('content:parsed', (event: ContentParsedEvent) => {
  console.log(`Parsed HTML at ${event.timestamp}`);
});
```

## 浏览器兼容性

- Chrome/Edge: 最新两个版本
- Firefox: 最新两个版本
- Safari: 最新两个版本
- 移动端浏览器: iOS Safari 12+, Chrome Android 80+

## 贡献指南

欢迎提交 Issue 和 Pull Request！

```bash
# 克隆项目
git clone https://github.com/yourusername/markdown-river.git
cd markdown-river

# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 许可证

ISC License

## 致谢

- [marked](https://marked.js.org/) - 强大的 Markdown 解析器
- [html-react-parser](https://github.com/remarkablemark/html-react-parser) - HTML 到 React 的转换器
- [mitt](https://github.com/developit/mitt) - 轻量级事件发射器
