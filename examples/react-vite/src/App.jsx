import { useState, useEffect } from 'react';
import { useMarkdownRiver } from 'markdown-river';
import './App.css';

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

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [strategy, setStrategy] = useState('standard');
  const { write, end, content, rawHtml } = useMarkdownRiver({
    strategy,
    markedOptions: {
      breaks: true,
      gfm: true,
    },
  });

  // 模拟流式输入
  const startStreaming = () => {
    setIsStreaming(true);
    let index = 0;

    const interval = setInterval(() => {
      if (index < AI_RESPONSE.length) {
        write(AI_RESPONSE[index]);
        index++;
      } else {
        clearInterval(interval);
        end();
        setIsStreaming(false);
      }
    }, 15); // 每 15ms 输出一个字符
  };

  // 重置
  const reset = () => {
    window.location.reload();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Markdown River React 示例</h1>
        <div className="controls">
          <label>
            策略：
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              disabled={isStreaming || content}
            >
              <option value="standard">标准策略</option>
              <option value="conservative">保守策略</option>
            </select>
          </label>
          <button onClick={startStreaming} disabled={isStreaming || content}>
            {isStreaming ? '正在输入...' : '开始演示'}
          </button>
          {content && !isStreaming && <button onClick={reset}>重置</button>}
        </div>
      </header>

      <main className="app-main">
        <div className="chat-container">
          <div className="message">
            <div className="avatar">AI</div>
            <div className="content markdown-content">
              {content || (
                <div className="placeholder">点击"开始演示"查看流式 Markdown 渲染效果</div>
              )}
            </div>
          </div>
        </div>

        {rawHtml && (
          <details className="debug-info">
            <summary>查看原始 HTML</summary>
            <pre>{rawHtml}</pre>
          </details>
        )}
      </main>
    </div>
  );
}

export default App;
