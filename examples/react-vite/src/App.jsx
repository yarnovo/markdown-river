import { useState, useEffect, useRef } from 'react';
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

<h3>任务列表（GFM 扩展）</h3>
<ul class="task-list">
  <li class="task-list-item"><input type="checkbox" checked disabled> 已完成的任务</li>
  <li class="task-list-item"><input type="checkbox" disabled> 待完成的任务</li>
  <li class="task-list-item"><input type="checkbox" checked disabled> 另一个已完成任务</li>
</ul>

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

  const [streamHtml, setStreamHtml] = useState(''); // 原始流式 HTML（可能不完整）
  const [safeHtml, setSafeHtml] = useState(''); // 转换后的安全 HTML
  const [displayHtml, setDisplayHtml] = useState(''); // 最终渲染的 HTML
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState(5); // 默认 5ms
  const intervalRef = useRef(null);
  const indexRef = useRef(0);

  // 转换函数：过滤掉末尾不完整的标签
  const convertToSafeHtml = html => {
    if (!html) return '';

    // 检查是否在代码块中
    const isInCodeBlock = html => {
      // 统计 <code> 和 </code> 标签的数量
      const codeOpens = (html.match(/<code[^>]*>/g) || []).length;
      const codeCloses = (html.match(/<\/code>/g) || []).length;
      // 如果开启标签比关闭标签多，说明在代码块中
      return codeOpens > codeCloses;
    };

    // 从末尾向前查找最后一个 < 符号
    let lastOpenBracket = html.lastIndexOf('<');

    // 如果没有 < 符号，整个内容都是安全的
    if (lastOpenBracket === -1) {
      return html;
    }

    // 检查这个 < 是否在代码块中
    const beforeLastBracket = html.substring(0, lastOpenBracket);
    if (isInCodeBlock(beforeLastBracket)) {
      // 在代码块中，< 是普通字符，不需要处理
      return html;
    }

    // 检查这个 < 后面是否有对应的 >
    let hasClosingBracket = html.indexOf('>', lastOpenBracket) !== -1;

    // 如果有闭合的 >，说明标签是完整的
    if (hasClosingBracket) {
      return html;
    }

    // 如果没有闭合，需要截断到 < 之前
    return html.substring(0, lastOpenBracket);
  };

  // 开始流式输出
  const startStreaming = () => {
    // 如果正在流式输出，先停止
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 重置状态
    setStreamHtml('');
    setSafeHtml('');
    setDisplayHtml('');
    indexRef.current = 0;
    setIsStreaming(true);

    // 模拟流式输入 - 逐字符填充 streamHtml
    let streamIndex = 0;
    intervalRef.current = setInterval(() => {
      if (streamIndex < fullHtml.length) {
        // 逐字符增加到 streamHtml
        streamIndex++;
        setStreamHtml(fullHtml.slice(0, streamIndex));
      } else {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsStreaming(false);
      }
    }, speed);
  };

  // 监听 safeHtml 变化，直接渲染
  useEffect(() => {
    setDisplayHtml(safeHtml);
  }, [safeHtml]);

  // 停止流式输出
  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  };

  // 监听 streamHtml 变化，自动转换为安全的 HTML
  useEffect(() => {
    const safe = convertToSafeHtml(streamHtml);
    setSafeHtml(safe);
  }, [streamHtml]);

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
            {streamHtml ? '重新开始' : '开始演示'}
          </button>
          {isStreaming && <button onClick={stopStreaming}>停止</button>}
        </div>
      </header>

      <main className="app-main" style={{ display: 'flex', gap: '15px', padding: '20px' }}>
        {/* 左侧：原始流式 HTML */}
        <div style={{ flex: '0 0 25%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>原始流式 HTML</h3>
            <span style={{ fontSize: '14px', color: '#666' }}>{streamHtml.length} 字符</span>
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
            {streamHtml}
          </pre>
        </div>

        {/* 中间：转换后的安全 HTML */}
        <div style={{ flex: '0 0 25%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>安全 HTML</h3>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {safeHtml.length} 字符
              {streamHtml.length > safeHtml.length && (
                <span style={{ color: '#dc3545', marginLeft: '10px' }}>
                  过滤了 {streamHtml.length - safeHtml.length} 字符
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
            {safeHtml}
          </pre>
        </div>

        {/* 右侧：渲染效果 */}
        <div style={{ flex: '0 0 50%', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>渲染效果</h3>
            <span style={{ fontSize: '14px', color: '#666' }}>{displayHtml.length} 字符</span>
          </div>
          <div
            className="markdown-content"
            style={{
              backgroundColor: '#fff',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
