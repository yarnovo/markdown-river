import { MarkdownRiver } from 'markdown-river';

// 模拟 AI 流式响应的文本
const AI_RESPONSE = `# 欢迎使用 Markdown River 🌊

这是一个 **流式 Markdown 渲染器** 的演示，专门解决 AI 聊天应用中的渲染闪烁问题。

## 核心特性

1. **无闪烁渲染** - 格式符号不会先显示后消失
2. *智能缓冲* - 基于歧义检测的智能解析
3. \`框架无关\` - 可以集成到任何前端框架

### 代码示例

\`\`\`javascript
const river = new MarkdownRiver({
  strategy: 'standard',
  markedOptions: {
    breaks: true,
    gfm: true
  }
});

river.on('content:parsed', ({ html }) => {
  console.log('Parsed:', html);
});
\`\`\`

## 为什么选择 Markdown River？

传统的 Markdown 渲染器在处理流式输入时会出现：
- 星号 (*) 先显示，然后突然变成斜体
- 格式符号的闪烁影响用户体验
- 无法预知格式的结束位置

而 **Markdown River** 通过智能的歧义检测完美解决了这些问题！

---

*感谢使用 Markdown River，让 AI 对话体验更流畅！*`;

// DOM 元素
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const contentDiv = document.getElementById('content');
const debugInfo = document.getElementById('debug-info');
const rawHtmlPre = document.getElementById('raw-html');

// 对比演示元素
const comparisonInput = document.getElementById('comparison-input');
const compareBtn = document.getElementById('compare-btn');
const parseResult = document.getElementById('parse-result');

let river = null;
let isStreaming = false;
let streamingSpeed = 15; // 默认速度 15ms

// 初始化 MarkdownRiver
function initRiver() {
  river = new MarkdownRiver({
    markedOptions: {
      breaks: true,
      gfm: true,
    },
  });

  // 监听解析事件
  river.on('content:parsed', ({ html }) => {
    contentDiv.innerHTML = html;
    rawHtmlPre.textContent = html;
    if (html) {
      debugInfo.style.display = 'block';
    }
  });
}

// 开始流式演示
function startStreaming() {
  if (isStreaming) return;

  // 初始化
  initRiver();

  // 清空内容
  contentDiv.innerHTML = '';
  debugInfo.style.display = 'none';

  // 更新 UI
  isStreaming = true;
  startBtn.disabled = true;
  startBtn.textContent = '正在输入...';
  strategySelect.disabled = true;

  // 模拟流式输入
  let index = 0;
  const interval = setInterval(() => {
    if (index < AI_RESPONSE.length) {
      river.write(AI_RESPONSE[index]);
      index++;
    } else {
      clearInterval(interval);
      river.end();
      isStreaming = false;
      startBtn.style.display = 'none';
      resetBtn.style.display = 'inline-block';
    }
  }, streamingSpeed); // 使用可调节的速度
}

// 重置
function reset() {
  window.location.reload();
}

// 实时解析
function parseInput() {
  const input = comparisonInput.value;
  if (!input) return;

  const parseRiver = new MarkdownRiver({
    markedOptions: { breaks: true, gfm: true },
  });

  let resultHtml = '';
  parseRiver.on('content:parsed', ({ html }) => {
    resultHtml = html;
  });

  // 逐字符输入
  for (const char of input) {
    parseRiver.write(char);
  }
  parseRiver.end();
  parseResult.innerHTML = resultHtml || '<em>（无输出）</em>';
}

// 绑定事件
startBtn.addEventListener('click', startStreaming);
resetBtn.addEventListener('click', reset);
compareBtn.addEventListener('click', parseInput);

// 回车触发解析
comparisonInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    parseInput();
  }
});

// 速度控制
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

speedSlider.addEventListener('input', (e) => {
  streamingSpeed = Number(e.target.value);
  speedValue.textContent = `${streamingSpeed}ms`;
});

// 开始时禁用速度控制
function updateSpeedControl(disabled) {
  speedSlider.disabled = disabled;
}

// 修改开始函数以禁用速度控制
const originalStartStreaming = startStreaming;
startStreaming = function() {
  updateSpeedControl(true);
  originalStartStreaming();
};

// 设置默认对比文本
comparisonInput.value = '*Hello* **world**';
