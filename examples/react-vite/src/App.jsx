import { useState, useEffect } from 'react';
import { useMarkdownRiver } from 'markdown-river';
import { testCases } from '@markdown-river/test-suite';
import './App.css';

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(15); // 默认 15ms
  const [selectedCase, setSelectedCase] = useState('完整文档');
  const { write, end, content, rawHtml } = useMarkdownRiver({
    markedOptions: {
      breaks: true,
      gfm: true,
    },
  });

  // 模拟流式输入
  const startStreaming = () => {
    setIsStreaming(true);
    const text = testCases[selectedCase];
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        write(text[index]);
        index++;
      } else {
        clearInterval(interval);
        end();
        setIsStreaming(false);
      }
    }, speed); // 使用可调节的速度
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
            测试用例：
            <select
              value={selectedCase}
              onChange={e => setSelectedCase(e.target.value)}
              disabled={isStreaming || content}
            >
              {Object.keys(testCases).map(caseName => (
                <option key={caseName} value={caseName}>
                  {caseName}
                </option>
              ))}
            </select>
          </label>
          <label>
            速度：
            <input
              type="range"
              min="5"
              max="100"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              disabled={isStreaming || content}
            />
            <span>{speed}ms</span>
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
