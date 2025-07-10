import { useState } from 'react';
import { useMarkdownRiver } from 'markdown-river';
import { testCases } from '@markdown-river/test-suite';
import './App.css';

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(15); // 默认 15ms
  const [selectedCase, setSelectedCase] = useState('完整文档');
  const [currentCase, setCurrentCase] = useState('');
  const [streamInterval, setStreamInterval] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0); // 当前输入位置
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

    // 检查是否是"重新开始"：如果当前正在运行，就是重新开始
    const isRestart = isStreaming;

    // 重新开始时强制重置，继续时保持状态
    if (isRestart || !isPaused) {
      reset();
      setCurrentCase(selectedCase);
      setCurrentIndex(0);
    }

    setIsStreaming(true);
    setIsPaused(false);

    const text = testCases[currentCase || selectedCase];
    let index = isRestart || !isPaused ? 0 : currentIndex; // 重新开始时从0开始

    const interval = setInterval(() => {
      if (index < text.length) {
        write(text[index]);
        index++;
        setCurrentIndex(index);
      } else {
        clearInterval(interval);
        end();
        setIsStreaming(false);
        setStreamInterval(null);
      }
    }, speed); // 使用可调节的速度

    setStreamInterval(interval);
  };

  // 暂停流式输入 - 保持当前状态
  const pauseStreaming = () => {
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }
    setIsStreaming(false);
    setIsPaused(true);
  };

  // 停止流式输入 - 恢复到初始状态
  const stopStreaming = () => {
    if (streamInterval) {
      clearInterval(streamInterval);
      setStreamInterval(null);
    }
    setIsStreaming(false);
    setIsPaused(false);
    setCurrentCase(''); // 清空当前用例显示
    setCurrentIndex(0); // 重置索引
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
              max="200"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              disabled={isStreaming}
            />
            <span>{speed}ms</span>
          </label>
          <button onClick={startStreaming}>
            {isStreaming ? '重新开始' : isPaused ? '继续' : '开始演示'}
          </button>
          {isStreaming && <button onClick={pauseStreaming}>暂停</button>}
          {(isStreaming || isPaused) && <button onClick={stopStreaming}>停止</button>}
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
