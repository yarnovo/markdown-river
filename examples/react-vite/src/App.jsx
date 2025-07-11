import { useState, useEffect, useRef } from 'react';
import { MarkdownRiver } from '../../../src/core/MarkdownRiver.ts';
import './App.css';

function App() {
  // 定义一个完整的 Markdown 转换后的 HTML 片段
  const fullHtml = `
<h1>Markdown River 流式渲染演示</h1>
<p>这是一个<strong>流式渲染</strong>的示例，展示了如何<em>智能地</em>输出 HTML 内容，确保标签的完整性。</p>

<h2>基础格式</h2>
<p><strong>加粗文本</strong> 和 <em>斜体文本</em> 以及 <strong><em>加粗斜体组合</em></strong>。</p>
<p>行内代码：<code>const x = 42;</code> 和 <code>console.log('Hello')</code>。</p>
<p>链接示例：<a href="https://github.com">GitHub</a> 和 <a href="https://example.com" title="示例网站">带标题的链接</a>。</p>

<h2>列表演示</h2>
<h3>无序列表</h3>
<ul>
  <li>第一项</li>
  <li>第二项包含<strong>加粗</strong>文本</li>
  <li>第三项包含<code>行内代码</code></li>
  <li>嵌套列表：
    <ul>
      <li>子项目 1</li>
      <li>子项目 2</li>
    </ul>
  </li>
</ul>

<h3>有序列表</h3>
<ol>
  <li>步骤一：准备环境</li>
  <li>步骤二：编写代码</li>
  <li>步骤三：测试和部署</li>
</ol>

<h2>代码块</h2>
<pre><code class="language-javascript">// JavaScript 代码示例
function streamingRender(html) {
  let index = 0;
  const interval = setInterval(() => {
    if (index < html.length) {
      // 智能分词，确保标签完整
      const nextIndex = getNextCompleteToken(html, index);
      setDisplayHtml(html.slice(0, nextIndex));
      index = nextIndex;
    } else {
      clearInterval(interval);
    }
  }, speed);
}

// 调用函数
streamingRender(htmlContent);</code></pre>

<pre><code class="language-python"># Python 示例
def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# 输出前10个斐波那契数
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")</code></pre>

<h2>引用块</h2>
<blockquote>
  <p>这是一个引用块。可以包含<strong>格式化</strong>文本。</p>
  <p>引用块可以有多个段落。</p>
  <blockquote>
    <p>嵌套的引用块也是支持的。</p>
  </blockquote>
</blockquote>

<h2>表格（GFM 扩展）</h2>
<table>
  <thead>
    <tr>
      <th align="left">功能</th>
      <th align="center">状态</th>
      <th align="right">进度</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="left">智能分词</td>
      <td align="center">✅ 完成</td>
      <td align="right">100%</td>
    </tr>
    <tr>
      <td align="left">流式渲染</td>
      <td align="center">✅ 完成</td>
      <td align="right">100%</td>
    </tr>
    <tr>
      <td align="left">标签完整性</td>
      <td align="center">✅ 完成</td>
      <td align="right">100%</td>
    </tr>
  </tbody>
</table>

<h2>图片</h2>
<p><img src="https://picsum.photos/400/300" alt="示例图片" title="随机美图"></p>

<h2>分隔线</h2>
<hr>

<h2>转义和特殊字符</h2>
<p>反斜杠转义：\\* 不是斜体 \\* ，\\[不是链接\\]</p>
<p>HTML 实体：&copy; 2024 &middot; &lt;标签&gt; &amp; &quot;引号&quot;</p>
<p>Unicode 表情：🚀 🌟 💻 📚</p>

<h2>嵌套格式</h2>
<p>这是一个包含<strong>多种<em>嵌套</em>格式</strong>的段落，其中有<code>行内代码</code>和<a href="#">链接</a>。</p>
<ul>
  <li>列表项包含<strong>加粗的<a href="#">链接</a></strong></li>
  <li>另一个项目有<em>斜体的<code>代码片段</code></em></li>
</ul>

<h2>段落和换行</h2>
<p>这是第一个段落。段落之间通过空行分隔。这行仍然属于第一个段落。</p>
<p>这是第二个段落。使用两个空格加换行可以创建硬换行：<br>
这是新的一行。</p>

<hr>
<p><small><em>文档结束 - Markdown River 流式渲染演示</em></small></p>
  `.trim();

  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(5); // 默认 5ms
  const intervalRef = useRef(null);
  const riverRef = useRef(new MarkdownRiver());
  const [currentHtml, setCurrentHtml] = useState('');

  // 设置 HTML 更新监听器
  useEffect(() => {
    const river = riverRef.current;
    const handleHtmlUpdate = html => {
      setCurrentHtml(html);
    };

    river.onHtmlUpdate(handleHtmlUpdate);

    return () => {
      river.offHtmlUpdate(handleHtmlUpdate);
    };
  }, []);

  // 开始流式输出
  const startStreaming = () => {
    // 如果正在流式输出，先停止
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 重置状态
    riverRef.current.reset();
    setIsStreaming(true);

    // 模拟流式输入 - 逐字符填充
    let streamIndex = 0;
    intervalRef.current = setInterval(() => {
      if (streamIndex < fullHtml.length) {
        // 逐字符写入到 MarkdownRiver
        const nextChar = fullHtml[streamIndex];
        riverRef.current.write(nextChar);
        streamIndex++;
      } else {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsStreaming(false);
      }
    }, speed);
  };

  // 停止流式输出
  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>流式 HTML 安全渲染示例</h1>
        <div className="controls">
          <label>
            速度：
            <input
              type="range"
              min="1"
              max="50"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              disabled={isStreaming}
            />
            <span>{speed}ms</span>
          </label>
          <button onClick={startStreaming} disabled={isStreaming}>
            {currentHtml ? '重新开始' : '开始演示'}
          </button>
          {isStreaming && <button onClick={stopStreaming}>停止</button>}
        </div>
      </header>

      <main className="app-main" style={{ display: 'flex', gap: '15px', padding: '20px' }}>
        {/* 左侧：原始流式 HTML */}
        <div style={{ flex: '0 0 25%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>原始流式 HTML</h3>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {riverRef.current.getStreamHtml().length} 字符
            </span>
          </div>
          <pre
            style={{
              backgroundColor: '#fff3cd',
              padding: '15px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
              fontSize: '12px',
              lineHeight: '1.5',
              border: '1px solid #ffeeba',
            }}
          >
            {riverRef.current.getStreamHtml()}
          </pre>
        </div>

        {/* 中间：转换后的安全 HTML */}
        <div style={{ flex: '0 0 25%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>安全 HTML</h3>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {riverRef.current.getSafeHtml().length} 字符
              {riverRef.current.getStreamHtml().length > riverRef.current.getSafeHtml().length && (
                <span style={{ color: '#dc3545', marginLeft: '10px' }}>
                  过滤了{' '}
                  {riverRef.current.getStreamHtml().length - riverRef.current.getSafeHtml().length}{' '}
                  字符
                </span>
              )}
            </span>
          </div>
          <pre
            style={{
              backgroundColor: '#d4edda',
              padding: '15px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              margin: 0,
              fontSize: '12px',
              lineHeight: '1.5',
              border: '1px solid #c3e6cb',
            }}
          >
            {riverRef.current.getSafeHtml()}
          </pre>
        </div>

        {/* 右侧：渲染效果 */}
        <div style={{ flex: '0 0 50%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>渲染效果</h3>
            <span style={{ fontSize: '14px', color: '#666' }}>{currentHtml.length} 字符</span>
          </div>
          <div
            className="markdown-content"
            style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            dangerouslySetInnerHTML={{ __html: currentHtml }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
