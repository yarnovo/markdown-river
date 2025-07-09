// Markdown River Demo
import { StreamingMarkdownRenderer } from './static/src/streaming-markdown-renderer.js';

// 示例 Markdown 文本
const sampleMarkdown = `# 🌊 Markdown River 演示

这是一个**流式 Markdown 渲染器**的演示，专为解决 AI 聊天应用中的格式符号闪烁问题而设计。

## ✨ 核心特性

### 1. 防止格式符号闪烁
当 AI 返回 \`**加粗文本**\` 时，传统渲染器会先显示星号，然后突然变成加粗格式，造成视觉闪烁。

我们的解决方案：通过**智能缓冲延迟**获得预判时间，避免闪烁。

### 2. 流式输入支持
- 支持逐字符输入
- 支持分块输入
- 自适应渲染速率

### 3. 格式支持
支持 CommonMark 标准的基础格式：
- **粗体** 和 *斜体*
- \`行内代码\`
- [链接](https://github.com)
- 有序和无序列表

#### 代码块示例：
\`\`\`javascript
const renderer = new StreamingMarkdownRenderer({
  container: outputElement,
  enableMetrics: true,
  debug: true
});

// 流式输入
renderer.write('**Bold');
renderer.write(' text**');
renderer.end();
\`\`\`

### 4. 列表展示

**无序列表**：
- 第一项内容
- 第二项内容
  - 嵌套项目
- 第三项内容

**有序列表**：
1. 初始化渲染器
2. 开始流式输入
3. 观察渲染效果
4. 调整输入速度

### 5. 引用和分隔线

> 这是一个引用块
> 可以包含多行内容
> 展示引用的渲染效果

---

## 🚀 性能监控

渲染器内置了完整的性能监控功能：
- 实时状态跟踪
- 字符处理统计
- 渲染时间监控
- 错误次数统计

## 🔧 使用指南

1. 在左侧输入框中输入 Markdown 文本
2. 点击"开始流式输入"按钮
3. 观察右侧的实时渲染效果
4. 调整输入速度观察不同效果
5. 查看底部系统日志了解详细信息

**试试调整输入速度，观察在不同速度下的渲染表现！**`;

class DemoApp {
  constructor() {
    this.renderer = null;
    this.streamingInterval = null;
    this.startTime = 0;
    this.totalChars = 0;
    this.errorCount = 0;
    
    this.initElements();
    this.bindEvents();
    this.loadSample();
    this.log('系统初始化完成', 'success');
  }

  initElements() {
    // 控制元素
    this.streamBtn = document.getElementById('streamBtn');
    this.clearBtn = document.getElementById('clearBtn');
    this.sampleBtn = document.getElementById('sampleBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.clearLogsBtn = document.getElementById('clearLogsBtn');
    
    // 输入输出
    this.input = document.getElementById('input');
    this.output = document.getElementById('output');
    
    // 控制器
    this.speedInput = document.getElementById('speed');
    this.speedValue = document.getElementById('speedValue');
    
    // 状态显示
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    this.charCount = document.getElementById('charCount');
    this.renderTime = document.getElementById('renderTime');
    this.errorCountEl = document.getElementById('errorCount');
    
    // 日志
    this.logs = document.getElementById('logs');
  }

  bindEvents() {
    this.streamBtn.addEventListener('click', () => this.toggleStreaming());
    this.clearBtn.addEventListener('click', () => this.clearContent());
    this.sampleBtn.addEventListener('click', () => this.loadSample());
    this.resetBtn.addEventListener('click', () => this.resetRenderer());
    this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
    
    this.speedInput.addEventListener('input', () => this.updateSpeed());
    
    // 实时预览（非流式）
    let typingTimeout = null;
    this.input.addEventListener('input', () => {
      if (this.streamingInterval) return; // 流式输入时不响应
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      typingTimeout = setTimeout(() => {
        this.renderPreview();
      }, 300);
    });
  }

  initRenderer() {
    if (this.renderer) {
      this.renderer.reset();
      this.log('渲染器重置完成', 'info');
    } else {
      this.renderer = new StreamingMarkdownRenderer({
        container: this.output,
        enableMetrics: true,
        debug: true
      });
      this.log('渲染器初始化完成', 'success');
    }

    // 监听渲染器事件
    this.renderer.on('render:start', (data) => {
      this.updateStatus('rendering', '渲染中');
      this.startTime = data.startTime;
      this.log('开始渲染', 'info');
    });

    this.renderer.on('render:progress', (data) => {
      this.totalChars = data.processedChars;
      this.updateCharCount();
    });

    this.renderer.on('render:end', (data) => {
      this.updateStatus('ended', '已完成');
      this.updateRenderTime(data.duration);
      this.log('渲染完成，耗时: ' + data.duration + 'ms，字符数: ' + data.totalChars, 'success');
    });

    this.renderer.on('render:error', (data) => {
      this.updateStatus('error', '错误');
      this.errorCount++;
      this.updateErrorCount();
      this.log('渲染错误: ' + data.error.message, 'error');
    });

    this.renderer.on('render:state:changed', (data) => {
      this.log('状态变更: ' + data.previousState + ' → ' + data.newState, 'info');
    });
  }

  toggleStreaming() {
    if (this.streamingInterval) {
      this.stopStreaming();
    } else {
      this.startStreaming();
    }
  }

  startStreaming() {
    const text = this.input.value.trim();
    if (!text) {
      this.log('输入内容为空，无法开始流式输入', 'warning');
      return;
    }

    this.log('开始流式输入，内容长度: ' + text.length + ' 字符', 'info');
    this.initRenderer();
    
    let index = 0;
    const speed = parseInt(this.speedInput.value);
    
    this.streamBtn.textContent = '停止输入';
    this.streamBtn.classList.remove('primary');
    this.streamBtn.classList.add('danger');
    
    this.totalChars = 0;
    this.updateCharCount();
    
    this.streamingInterval = setInterval(() => {
      if (index >= text.length) {
        this.stopStreaming();
        return;
      }

      // 模拟真实的流式输入模式
      const chunkSize = this.getRandomChunkSize();
      const chunk = text.slice(index, index + chunkSize);
      
      this.renderer.write(chunk);
      this.log('写入数据: "' + chunk.replace(/\n/g, '\\n') + '" (位置: ' + index + ')', 'info');
      
      index += chunkSize;
    }, speed);
  }

  stopStreaming() {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
      this.log('流式输入已停止', 'info');
    }

    this.streamBtn.textContent = '开始流式输入';
    this.streamBtn.classList.remove('danger');
    this.streamBtn.classList.add('primary');

    if (this.renderer) {
      this.renderer.end();
      this.log('渲染器结束输入', 'info');
    }
  }

  getRandomChunkSize() {
    // 模拟真实的流式输入：大部分时候是单字符，偶尔是多字符
    const rand = Math.random();
    if (rand < 0.7) return 1;           // 70% 概率单字符
    if (rand < 0.9) return 2;           // 20% 概率两字符
    return Math.floor(Math.random() * 3) + 3; // 10% 概率 3-5 字符
  }

  renderPreview() {
    const text = this.input.value.trim();
    if (!text) {
      this.output.innerHTML = '';
      return;
    }

    this.log('开始实时预览渲染', 'info');
    this.initRenderer();
    
    // 一次性渲染
    this.renderer.write(text);
    this.renderer.end();
  }

  clearContent() {
    this.stopStreaming();
    this.input.value = '';
    this.output.innerHTML = '';
    
    if (this.renderer) {
      this.renderer.reset();
    }
    
    this.totalChars = 0;
    this.errorCount = 0;
    this.updateCharCount();
    this.updateErrorCount();
    this.updateRenderTime(0);
    this.updateStatus('idle', '空闲');
    
    this.log('内容已清空', 'info');
  }

  loadSample() {
    this.clearContent();
    this.input.value = sampleMarkdown;
    this.log('示例内容已加载', 'success');
    
    // 自动开始预览
    setTimeout(() => this.renderPreview(), 100);
  }

  resetRenderer() {
    this.stopStreaming();
    
    if (this.renderer) {
      this.renderer.reset();
      this.log('渲染器已重置', 'info');
    }
    
    this.output.innerHTML = '';
    this.totalChars = 0;
    this.errorCount = 0;
    this.updateCharCount();
    this.updateErrorCount();
    this.updateRenderTime(0);
    this.updateStatus('idle', '空闲');
  }

  updateSpeed() {
    const speed = this.speedInput.value;
    this.speedValue.textContent = speed + 'ms';
    
    if (this.streamingInterval) {
      this.log('输入速度已更改为: ' + speed + 'ms', 'info');
      // 重新开始流式输入以应用新速度
      this.stopStreaming();
      setTimeout(() => this.startStreaming(), 100);
    }
  }

  updateStatus(status, text) {
    this.statusIndicator.className = 'status-indicator ' + status;
    this.statusText.textContent = text;
  }

  updateCharCount() {
    this.charCount.textContent = this.totalChars;
  }

  updateRenderTime(time) {
    this.renderTime.textContent = time + 'ms';
  }

  updateErrorCount() {
    this.errorCountEl.textContent = this.errorCount;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry ' + type;
    logEntry.innerHTML = '<span class="log-timestamp">[' + timestamp + ']</span>' + message;
    
    this.logs.appendChild(logEntry);
    this.logs.scrollTop = this.logs.scrollHeight;
    
    // 限制日志数量
    if (this.logs.children.length > 100) {
      this.logs.removeChild(this.logs.firstChild);
    }
  }

  clearLogs() {
    this.logs.innerHTML = '';
    this.log('日志已清空', 'info');
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.demoApp = new DemoApp();
});

// 导出给测试使用
window.StreamingMarkdownRenderer = StreamingMarkdownRenderer;