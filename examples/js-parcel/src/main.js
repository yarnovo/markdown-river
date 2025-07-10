import { MarkdownRiver } from 'markdown-river';
import { testCases } from '@markdown-river/test-suite';

// DOM 元素
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const contentDiv = document.getElementById('content');
const debugInfo = document.getElementById('debug-info');
const rawHtmlPre = document.getElementById('raw-html');
const testCaseSelect = document.getElementById('test-case-select');

// 对比演示元素
const comparisonInput = document.getElementById('comparison-input');
const compareBtn = document.getElementById('compare-btn');
const parseResult = document.getElementById('parse-result');

let river = null;
let isStreaming = false;
let streamingSpeed = 15; // 默认速度 15ms

// 初始化测试用例选择器
function initTestCaseSelect() {
  // 清空现有选项
  testCaseSelect.innerHTML = '';

  // 添加选项
  Object.keys(testCases).forEach(caseName => {
    const option = document.createElement('option');
    option.value = caseName;
    option.textContent = caseName;
    testCaseSelect.appendChild(option);
  });

  // 设置默认值
  testCaseSelect.value = '完整文档';
}

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

  // 获取选中的测试用例
  const selectedCase = testCaseSelect.value;
  const text = testCases[selectedCase];

  // 模拟流式输入
  let index = 0;
  const interval = setInterval(() => {
    if (index < text.length) {
      river.write(text[index]);
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
    // 实时更新显示
    parseResult.innerHTML = resultHtml || '<em>（无输出）</em>';
  });

  // 逐字符流式输入
  let charIndex = 0;

  function writeNextChar() {
    if (charIndex < input.length) {
      const char = input[charIndex];
      parseRiver.write(char);
      charIndex++;

      // 延迟写入下一个字符，模拟真实的流式输入
      setTimeout(writeNextChar, 50);
    } else {
      parseRiver.end();
    }
  }

  // 开始写入
  writeNextChar();
}

// 绑定事件
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

speedSlider.addEventListener('input', e => {
  streamingSpeed = Number(e.target.value);
  speedValue.textContent = `${streamingSpeed}ms`;
});

// 开始时禁用控件
function updateControls(disabled) {
  speedSlider.disabled = disabled;
  testCaseSelect.disabled = disabled;
}

// 修改开始函数以禁用控件
const originalStartStreaming = startStreaming;
function startStreamingWrapper() {
  updateControls(true);
  originalStartStreaming();
}

// 使用包装函数
startBtn.addEventListener('click', startStreamingWrapper);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  initTestCaseSelect();
});

// 设置默认对比文本
comparisonInput.value = '```javascript\nconst msg = "hello";\nconsole.log(msg);';
