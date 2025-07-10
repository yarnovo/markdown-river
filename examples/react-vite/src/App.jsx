import { useState } from 'react';
import { useMarkdownRiver } from 'markdown-river';
import { testCases } from '@markdown-river/test-suite';
import './App.css';

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(15); // 默认 15ms
  const [selectedCase, setSelectedCase] = useState('完整文档');
  const [currentCase, setCurrentCase] = useState('');
  const [streamInterval, setStreamInterval] = useState(null);
  const { write, end, reset, content, rawHtml } = useMarkdownRiver({
    markedOptions: {
      breaks: true,
      gfm: true,
    },
  });

  // 模拟流式输入
  const startStreaming = () => {
    // 如果正在运行，先停止
    if (streamInterval) {
      clearInterval(streamInterval);
    }

    // 重置内容（重新开始时清空之前的内容）
    reset();

    setIsStreaming(true);
    setCurrentCase(selectedCase);
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
        setStreamInterval(null);
      }
    }, speed); // 使用可调节的速度

    setStreamInterval(interval);
  };

  // 停止流式输入 - 恢复到初始状态
  const stopStreaming = () => {
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }
    setIsStreaming(false);
    setCurrentCase(''); // 清空当前用例显示
    reset(); // 清空内容，恢复到初始状态
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Markdown River React 示例</h1>
        <div className="controls">
          <label>
            测试用例：
            <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
              {Object.keys(testCases).map(caseName => (
                <option key={caseName} value={caseName}>
                  {caseName}
                </option>
              ))}
            </select>
          </label>
          {currentCase && <div className="current-case">当前用例：{currentCase}</div>}
          <label>
            速度：
            <input
              type="range"
              min="5"
              max="100"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              disabled={isStreaming}
            />
            <span>{speed}ms</span>
          </label>
          <button onClick={startStreaming}>{isStreaming ? '重新开始' : '开始演示'}</button>
          {isStreaming && <button onClick={stopStreaming}>停止</button>}
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
