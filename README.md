# Markdown River

一个专门为 AI 流式输出设计的 HTML 安全渲染器，解决流式场景中 HTML 标签不完整导致的闪烁问题。

## 特性

- 🚀 **HTML 流式渲染** - 专门处理 AI 输出的 HTML 内容，避免不完整标签的闪烁
- 🛡️ **智能标签过滤** - 智能识别并过滤不完整的 HTML 标签，只渲染安全内容
- 📏 **精确处理** - 能够区分 HTML 标签和比较运算符（如 `a < b`）
- 🧠 **代码块感知** - 正确处理代码块中的特殊字符
- 🔧 **事件驱动** - 简洁的事件 API，框架无关
- 📦 **零依赖** - 核心实现无任何外部依赖，体积极小

## 安装

```bash
npm install markdown-river
# 或
yarn add markdown-river
# 或
pnpm add markdown-river
```

## 核心问题

在 AI 聊天应用中，后端通常以流式方式输出 HTML 内容。传统的 innerHTML 直接赋值会导致：

- **标签闪烁**：不完整的 HTML 标签（如 `<div` 或 `</pr`）会被显示为文本
- **内容跳变**：当标签补全时，界面会突然从文本变为 HTML 元素
- **体验不佳**：用户看到明显的闪烁和跳跃

**解决方案**：只渲染完整的 HTML 标签，等待不完整标签补全后再显示。

## 快速开始

### 基础用法

```javascript
import { MarkdownRiver } from 'markdown-river';

// 创建渲染器实例
const river = new MarkdownRiver();

// 监听 HTML 更新
river.onHtmlUpdate(html => {
  document.getElementById('output').innerHTML = html;
});

// 流式输入 HTML 内容
river.write('<h1>Hello ');
river.write('<strong>Wo'); // 不完整标签，不会立即显示
river.write('rld</strong></h1>'); // 标签完整后显示
river.write('<p>This is safe ');
river.write('streaming!</p>');
```

### React 集成

```jsx
import { MarkdownRiver } from 'markdown-river';
import { useState, useEffect, useRef } from 'react';

function StreamingChatMessage({ htmlStream }) {
  const [html, setHtml] = useState('');
  const riverRef = useRef(new MarkdownRiver());

  useEffect(() => {
    const river = riverRef.current;

    // 注册监听器
    river.onHtmlUpdate(setHtml);

    // 清理函数
    return () => {
      river.offHtmlUpdate(setHtml);
    };
  }, []);

  useEffect(() => {
    // 处理新的 HTML 片段
    if (htmlStream) {
      riverRef.current.write(htmlStream);
    }
  }, [htmlStream]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

## API 文档

### MarkdownRiver

主渲染器类，负责 HTML 流处理和安全过滤。

#### 构造函数

```typescript
new MarkdownRiver();
```

#### 核心方法

- `onHtmlUpdate(listener: (html: string) => void): void` - 注册 HTML 更新监听器
- `offHtmlUpdate(listener: (html: string) => void): void` - 移除监听器
- `write(chunk: string): void` - 写入 HTML 片段
- `reset(): void` - 重置状态，清空所有内容
- `getStreamHtml(): string` - 获取完整的流式 HTML（包含不完整标签）
- `getSafeHtml(): string` - 获取安全的 HTML（已过滤不完整标签）

#### 使用示例

```typescript
const river = new MarkdownRiver();

// 注册监听器
river.onHtmlUpdate(safeHtml => {
  console.log('安全 HTML:', safeHtml);
});

// 流式写入
river.write('<p>Hello '); // 输出: '<p>Hello '
river.write('<strong>Wo'); // 输出: '<p>Hello ' (不完整标签被过滤)
river.write('rld</strong>'); // 输出: '<p>Hello <strong>World</strong>'
river.write('!</p>'); // 输出: '<p>Hello <strong>World</strong>!</p>'
```

## 核心机制

### 智能标签过滤

Markdown River 的核心算法会智能分析 HTML 内容：

1. **检测不完整标签**：识别末尾没有闭合的 `<` 标签
2. **代码块感知**：在 `<pre><code>` 代码块中，`<` 和 `>` 作为普通字符处理
3. **比较运算符识别**：区分 HTML 标签和比较运算符（如 `a < b`）
4. **HTML 实体处理**：正确处理 `&lt;` `&gt;` 等转义字符

### 处理示例

```javascript
// 场景 1：不完整的 HTML 标签
river.write('<div class="container'); // 等待标签完整
river.write('">Hello</div>'); // 标签完整，立即显示

// 场景 2：比较运算符
river.write('价格 < 100 元'); // 立即显示，< 不是标签

// 场景 3：代码块中的字符
river.write('<pre><code>if (a < b)</code></pre>'); // 代码块中的 < 正常显示

// 场景 4：HTML 实体
river.write('转义字符：&lt; &gt; &amp;'); // HTML 实体正常显示
```

## 高级用法

### 多监听器支持

```javascript
const river = new MarkdownRiver();

// 监听器 1：更新 DOM
river.onHtmlUpdate(html => {
  document.getElementById('content').innerHTML = html;
});

// 监听器 2：统计字符数
river.onHtmlUpdate(html => {
  const textLength = html.replace(/<[^>]*>/g, '').length;
  document.getElementById('counter').textContent = `${textLength} 字符`;
});

// 监听器 3：自动滚动
river.onHtmlUpdate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
```

### 错误处理和调试

```javascript
const river = new MarkdownRiver();

river.onHtmlUpdate(html => {
  try {
    // 业务逻辑
    updateUI(html);
  } catch (error) {
    console.error('UI 更新失败:', error);
    // 其他监听器不受影响
  }
});

// 调试：对比流式 HTML 和安全 HTML
console.log('流式 HTML:', river.getStreamHtml());
console.log('安全 HTML:', river.getSafeHtml());
```

### TypeScript 支持

```typescript
import { MarkdownRiver } from 'markdown-river';

const river = new MarkdownRiver();

// 类型安全的监听器
const updateHandler = (html: string): void => {
  document.body.innerHTML = html;
};

river.onHtmlUpdate(updateHandler);

// 确保类型正确
const safeHtml: string = river.getSafeHtml();
const streamHtml: string = river.getStreamHtml();
```

## 实际应用场景

### AI 聊天应用

```javascript
// 接收 AI 流式响应
async function handleAIResponse(stream) {
  const river = new MarkdownRiver();

  river.onHtmlUpdate(html => {
    updateChatMessage(html);
  });

  for await (const chunk of stream) {
    river.write(chunk.content);
  }
}
```

### 实时文档编辑

```javascript
// WebSocket 实时协作
websocket.onmessage = event => {
  const { type, content } = JSON.parse(event.data);

  if (type === 'content-update') {
    river.write(content);
  }
};
```

### 服务端渲染场景

```javascript
// Express.js 流式响应
app.get('/stream-content', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Transfer-Encoding': 'chunked',
  });

  const river = new MarkdownRiver();

  river.onHtmlUpdate(html => {
    res.write(`<div>${html}</div>`);
  });

  // 分块发送内容
  sendContentInChunks(river);
});
```

## 性能特点

- **零依赖**：核心代码无外部依赖，打包后体积极小
- **高效处理**：只在 HTML 实际变化时触发监听器
- **内存友好**：最小化缓冲，及时释放不需要的数据
- **异常隔离**：单个监听器出错不影响其他监听器

## 项目相关

### 在线演示

查看 [在线演示](https://yarnovo.github.io/markdown-river-demo) 体验完整功能。

### 开发和测试

```bash
# 克隆项目
git clone https://github.com/yarnovo/markdown-river.git
cd markdown-river

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build

# 启动演示
npm run demo
```

### 许可证

ISC License

---

**为什么叫 "Markdown River"？**

虽然现在专注于 HTML 处理，但项目最初的设计理念是让内容像河流一样流畅地渲染，没有闪烁和跳跃。这个名字体现了项目的核心目标：**流畅的用户体验**。
