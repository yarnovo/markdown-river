// 注意：这是一个简化的演示文件，实际使用时应该通过构建工具编译 TypeScript
import { StreamingMarkdownRenderer } from './static/index.js';

// 示例 Markdown 文本
const sampleMarkdown = `# Markdown River 演示

这是一个 **流式 Markdown 渲染器** 的演示，它可以实现类似 ChatGPT 的实时渲染效果。

## 特性展示

### 1. 文本格式

支持 **粗体**、*斜体*、***粗斜体*** 和 ~~删除线~~ 等格式。

### 2. 代码支持

行内代码：\`const renderer = new StreamingMarkdownRenderer()\`

代码块：

\`\`\`javascript
// 创建渲染器
const renderer = new StreamingMarkdownRenderer(container, {
  bufferTimeout: 50,
  enableMetrics: true
});

// 流式输入
renderer.write('# Hello World');
\`\`\`

### 3. 列表

无序列表：
- 第一项
- 第二项
  - 嵌套项
- 第三项

有序列表：
1. 步骤一
2. 步骤二
3. 步骤三

### 4. 引用和链接

> 这是一个引用块
> 可以包含多行内容

链接：[访问 GitHub](https://github.com)

图片：![示例图片](https://via.placeholder.com/150)

---

## 性能监控

渲染器内置了性能监控功能，可以实时查看：
- 解析时间
- 渲染时间
- 帧率
- 事件数量

试试调整输入速度，观察性能变化！`;

// DOM 元素
const input = document.getElementById('input');
const output = document.getElementById('output');
const streamBtn = document.getElementById('streamBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const speedInput = document.getElementById('speed');
const speedValue = document.getElementById('speedValue');
const metricsSpan = document.getElementById('metrics');

// 创建渲染器
let renderer = null;
let streamingInterval = null;

function initRenderer() {
  if (renderer) {
    renderer.destroy();
  }

  output.innerHTML = '';
  renderer = new StreamingMarkdownRenderer(output, {
    bufferTimeout: 50,
    renderBatchSize: 10,
    enableMetrics: true,
    syntaxHighlight: true,
  });

  // 监听性能报告
  renderer.on('monitor:report', report => {
    const { current } = report;
    const frameTime = current.frameTime.toFixed(2);
    const parseTime = current.parseTime.toFixed(2);
    const renderTime = current.renderTime.toFixed(2);

    // 更新状态指示器
    const status = document.querySelector('.status');
    if (current.frameTime > 16.67) {
      status.className = 'status bad';
    } else if (current.frameTime > 10) {
      status.className = 'status warning';
    } else {
      status.className = 'status good';
    }

    metricsSpan.textContent = `帧时间: ${frameTime}ms | 解析: ${parseTime}ms | 渲染: ${renderTime}ms | 事件: ${current.totalEvents}`;
  });
}

// 流式输入
function startStreaming() {
  if (streamingInterval) {
    stopStreaming();
    return;
  }

  const text = input.value;
  if (!text) return;

  initRenderer();

  let index = 0;
  const speed = parseInt(speedInput.value);

  streamBtn.textContent = '停止输入';

  streamingInterval = setInterval(() => {
    if (index >= text.length) {
      stopStreaming();
      return;
    }

    // 模拟真实输入，有时输入单个字符，有时输入几个字符
    const chunkSize = Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : 1;
    const chunk = text.slice(index, index + chunkSize);

    renderer.write(chunk);
    index += chunkSize;
  }, speed);
}

function stopStreaming() {
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }

  streamBtn.textContent = '开始流式输入';

  if (renderer) {
    renderer.end();
  }
}

// 清空
function clear() {
  stopStreaming();
  input.value = '';
  output.innerHTML = '';
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
  metricsSpan.textContent = '准备就绪';
}

// 加载示例
function loadSample() {
  clear();
  input.value = sampleMarkdown;
}

// 更新速度显示
function updateSpeed() {
  speedValue.textContent = speedInput.value + 'ms';
}

// 事件监听
streamBtn.addEventListener('click', startStreaming);
clearBtn.addEventListener('click', clear);
sampleBtn.addEventListener('click', loadSample);
speedInput.addEventListener('input', updateSpeed);

// 实时输入（非流式）
let typingTimeout = null;
input.addEventListener('input', () => {
  if (streamingInterval) return; // 流式输入时不响应

  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  typingTimeout = setTimeout(() => {
    if (!renderer) {
      initRenderer();
    }

    output.innerHTML = '';
    renderer = new StreamingMarkdownRenderer(output);

    // 一次性渲染
    renderer.write(input.value);
    renderer.end();
  }, 300);
});

// 初始化
updateSpeed();
loadSample();
