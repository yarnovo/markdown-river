import { MarkdownRiver } from './static/index.js';

// 示例数据
const demos = {
  welcome: `<h1>欢迎使用 Markdown River</h1>
<p>这是一个专为 <strong>AI 流式聊天</strong> 设计的 HTML 渲染器。</p>
<p>它解决了一个关键问题：<em>不完整标签导致的闪烁</em>。</p>
<blockquote>
  <p>当 AI 逐字符返回 HTML 时，传统渲染器会显示不完整的标签，造成闪烁。我们通过智能过滤解决了这个问题。</p>
</blockquote>
<p>试试切换不同的示例，感受流畅的打字效果！</p>`,

  complete: `<h1>Markdown River 功能演示</h1>
<p>这个渲染器支持所有常见的 Markdown 转换后的 HTML 格式。</p>

<h2>文本格式</h2>
<p>支持 <strong>加粗文本</strong>、<em>斜体文本</em> 和 <strong><em>组合格式</em></strong>。</p>
<p>还有 <code>行内代码</code> 和 <a href="https://github.com">链接</a>。</p>

<h2>列表</h2>
<h3>无序列表</h3>
<ul>
  <li>第一项</li>
  <li>第二项
    <ul>
      <li>嵌套项目</li>
    </ul>
  </li>
  <li>第三项</li>
</ul>

<h3>有序列表</h3>
<ol>
  <li>步骤一</li>
  <li>步骤二</li>
  <li>步骤三</li>
</ol>

<hr>
<p><small>更多功能等你探索...</small></p>`,

  code: `<h1>代码示例</h1>
<p>Markdown River 能够正确处理代码块中的特殊字符。</p>

<h2>JavaScript 示例</h2>
<pre><code>// 流式渲染器使用示例
const river = new MarkdownRiver();

// 注册监听器
river.onHtmlUpdate(html => {
  document.getElementById('output').innerHTML = html;
});

// 逐字符写入
for (let char of htmlContent) {
  river.write(char);
}</code></pre>

<h2>比较运算符处理</h2>
<pre><code>// 代码块中的 < 符号被正确保留
if (index < array.length) {
  console.log('继续处理...');
}

// 多重比较
if (a < b && b < c) {
  console.log('a 是最小值');
}</code></pre>`,

  comparison: `<h1>比较运算符的智能识别</h1>
<p>Markdown River 能够智能区分 HTML 标签和比较运算符。</p>

<h2>数学表达式</h2>
<p>简单比较：a < 5 且 b > 3</p>
<p>复合条件：x < 10 && y > 20</p>
<p>价格比较：price < $50.00</p>

<h2>与 HTML 标签混合</h2>
<p>这是一个包含 <strong>HTML 标签</strong> 和比较运算符 a < b 的段落。</p>
<p>注意：即使在流式输入时，< 符号也不会造成渲染问题。</p>`,

  table: `<h1>表格示例</h1>
<p>展示 Markdown 表格转换后的 HTML 渲染效果。</p>

<table>
  <thead>
    <tr>
      <th>功能</th>
      <th>状态</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>流式渲染</td>
      <td>✅ 支持</td>
      <td>逐字符平滑渲染</td>
    </tr>
    <tr>
      <td>标签过滤</td>
      <td>✅ 支持</td>
      <td>过滤不完整的 HTML 标签</td>
    </tr>
    <tr>
      <td>代码块</td>
      <td>✅ 支持</td>
      <td>保留代码中的 < 符号</td>
    </tr>
    <tr>
      <td>性能优化</td>
      <td>✅ 支持</td>
      <td>高效的局部分析算法</td>
    </tr>
  </tbody>
</table>`,
};

// 状态
let river = null;
let currentDemo = 'welcome';
let currentIndex = 0;
let interval = null;

// DOM 元素
const elements = {
  demoSelect: document.getElementById('demo-select'),
  speedSlider: document.getElementById('speed-slider'),
  speedDisplay: document.getElementById('speed-display'),
  content: document.getElementById('content'),
};

// 初始化
function init() {
  // 创建 MarkdownRiver 实例
  river = new MarkdownRiver();

  // 注册监听器
  river.onHtmlUpdate(html => {
    elements.content.innerHTML = html;
  });

  // 绑定事件
  elements.demoSelect.addEventListener('change', handleDemoChange);
  elements.speedSlider.addEventListener('input', updateSpeedDisplay);

  // 初始化显示
  updateSpeedDisplay();

  // 自动开始第一个演示
  startDemo();
}

// 处理示例切换
function handleDemoChange() {
  currentDemo = elements.demoSelect.value;
  stopDemo();
  startDemo();
}

// 更新速度显示
function updateSpeedDisplay() {
  const speed = elements.speedSlider.value;
  elements.speedDisplay.textContent = `${speed}ms`;

  // 如果正在播放，更新定时器以应用新速度
  if (interval) {
    clearInterval(interval);
    const newSpeed = parseInt(speed);
    startInterval(newSpeed);
  }
}

// 开始演示
function startDemo() {
  // 重置状态
  river.reset();
  currentIndex = 0;

  const speed = parseInt(elements.speedSlider.value);
  startInterval(speed);
}

// 启动定时器
function startInterval(speed) {
  const html = demos[currentDemo];

  interval = setInterval(() => {
    if (currentIndex < html.length) {
      river.write(html[currentIndex]);
      currentIndex++;
    } else {
      // 完成后停止
      clearInterval(interval);
      interval = null;
    }
  }, speed);
}

// 停止演示
function stopDemo() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
