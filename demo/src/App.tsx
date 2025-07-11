import { useState, useEffect, useRef, useCallback } from 'react';
import { MarkdownRiver } from 'markdown-river';
import { PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';

// 示例数据
const examples = [
  {
    id: 'welcome',
    name: '欢迎示例',
    content: `<h1>🌊 欢迎使用 Markdown River</h1>
<p>一个专为 <strong>AI 流式输出</strong> 设计的 HTML 渲染器，确保内容的安全和完整显示。</p>

<h2>✨ 核心特性</h2>
<ul>
  <li>🔄 实时流式渲染，无闪烁</li>
  <li>🚀 完整支持 CommonMark 规范及扩展</li>
  <li>🔀 支持 HTML 转义字符（&lt; &gt; &amp; 等）</li>
  <li>📝 支持代码块中的特殊字符处理</li>
  <li>🎯 专注于 AI 场景优化</li>
</ul>

<h2>🎮 如何使用</h2>
<p>选择上方的示例，体验不同的功能演示</p>

<p><em>💡 提示：调整播放速度，观察流式渲染的实时效果！</em></p>`
  },
  {
    id: 'commonmark',
    name: 'CommonMark 规范',
    content: `<h1>CommonMark 规范完整演示</h1>
<p>这是 <strong>CommonMark</strong> 规范的完整功能展示，包含所有核心语法元素。</p>

<h2>标题（Headings）</h2>
<h1>一级标题</h1>
<h2>二级标题</h2>
<h3>三级标题</h3>
<h4>四级标题</h4>
<h5>五级标题</h5>
<h6>六级标题</h6>

<h2>段落和换行（Paragraphs and Line Breaks）</h2>
<p>这是第一个段落。段落之间通过空行分隔。</p>
<p>这是第二个段落。<br>
这里使用了硬换行符。</p>

<h2>文本格式化（Text Formatting）</h2>
<p>支持 <strong>加粗文本</strong>、<em>斜体文本</em>、<strong><em>加粗斜体</em></strong>。</p>
<p>还支持 <code>行内代码</code> 和普通文本。</p>

<h2>链接（Links）</h2>
<p>这是一个 <a href="https://commonmark.org">CommonMark 规范</a> 的链接。</p>
<p>这是一个 <a href="https://example.com" title="示例网站">带标题的链接</a>。</p>

<h2>图片（Images）</h2>
<p><img src="https://picsum.photos/400/200" alt="随机图片" title="来自 Lorem Picsum"></p>

<h2>引用块（Blockquotes）</h2>
<blockquote>
  <p>这是一个引用块。引用块可以包含多个段落。</p>
  <p>引用块也支持 <strong>格式化</strong> 和 <code>代码</code>。</p>
  <blockquote>
    <p>嵌套引用也是支持的。</p>
  </blockquote>
</blockquote>

<h2>列表（Lists）</h2>
<h3>无序列表</h3>
<ul>
  <li>第一项</li>
  <li>第二项
    <ul>
      <li>嵌套项 2.1</li>
      <li>嵌套项 2.2</li>
    </ul>
  </li>
  <li>第三项</li>
</ul>

<h3>有序列表</h3>
<ol>
  <li>步骤一</li>
  <li>步骤二
    <ol>
      <li>子步骤 2.1</li>
      <li>子步骤 2.2</li>
    </ol>
  </li>
  <li>步骤三</li>
</ol>

<h2>代码块（Code Blocks）</h2>
<p>行内代码：<code>const x = 42;</code></p>

<h3>缩进代码块</h3>
<pre><code>// 这是缩进代码块
function hello() {
  console.log('Hello, World!');
}</code></pre>

<h3>围栏代码块</h3>
<pre><code class="language-javascript">// JavaScript 示例
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 比较运算符在代码块中正确显示
if (a < b && b < c) {
  console.log('a 是最小值');
}</code></pre>

<pre><code class="language-html">&lt;!-- HTML 示例 --&gt;
&lt;div class="container"&gt;
  &lt;h1&gt;标题&lt;/h1&gt;
  &lt;p&gt;这是一个段落&lt;/p&gt;
&lt;/div&gt;</code></pre>

<h2>分隔线（Horizontal Rules）</h2>
<p>下面是一条分隔线：</p>
<hr>
<p>分隔线上方和下方的内容。</p>

<h2>HTML 实体和特殊字符</h2>
<p>支持 HTML 实体：&copy; &reg; &trade; &hearts; &spades; &clubs; &diams;</p>
<p>数学比较：a < b, x > y, 5 <= 10, 8 >= 3</p>
<p>特殊字符：& < > " '</p>

<h2>嵌套结构</h2>
<ol>
  <li>有序列表项
    <ul>
      <li>嵌套的无序列表</li>
      <li>包含 <code>代码</code> 的项</li>
    </ul>
  </li>
  <li>引用块在列表中：
    <blockquote>
      <p>这是列表中的引用。</p>
    </blockquote>
  </li>
</ol>

<p><small>以上展示了 CommonMark 规范的所有核心语法元素。</small></p>`
  },
  {
    id: 'tables',
    name: '表格扩展',
    content: `<h1>表格扩展（Tables）</h1>
<p>表格是 GitHub Flavored Markdown 的扩展语法，不属于 CommonMark 规范。</p>

<h2>基础表格</h2>
<table>
  <thead>
    <tr>
      <th>功能</th>
      <th>状态</th>
      <th>版本</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>CommonMark 核心</td>
      <td>✅ 完全支持</td>
      <td>1.0</td>
    </tr>
    <tr>
      <td>表格扩展</td>
      <td>✅ 支持</td>
      <td>1.0</td>
    </tr>
    <tr>
      <td>任务列表</td>
      <td>✅ 支持</td>
      <td>1.0</td>
    </tr>
  </tbody>
</table>

<h2>对齐表格</h2>
<table>
  <thead>
    <tr>
      <th>左对齐</th>
      <th align="center">居中</th>
      <th align="right">右对齐</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>文本内容</td>
      <td align="center">居中文本</td>
      <td align="right">123</td>
    </tr>
    <tr>
      <td>更长的内容示例</td>
      <td align="center">⭐⭐⭐</td>
      <td align="right">456.78</td>
    </tr>
  </tbody>
</table>

<h2>复杂表格</h2>
<table>
  <thead>
    <tr>
      <th>产品</th>
      <th align="center">价格</th>
      <th align="center">库存</th>
      <th>描述</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>MacBook Pro</strong></td>
      <td align="center">¥15,999</td>
      <td align="center">10</td>
      <td>搭载 <code>M3 Pro</code> 芯片</td>
    </tr>
    <tr>
      <td><strong>iPhone 15</strong></td>
      <td align="center">¥5,999</td>
      <td align="center">25</td>
      <td>支持 <em>USB-C</em> 接口</td>
    </tr>
  </tbody>
</table>`
  },
  {
    id: 'tasklist',
    name: '任务列表',
    content: `<h1>任务列表（Task Lists）</h1>
<p>任务列表是 GitHub Flavored Markdown 的扩展语法。</p>

<h2>基础任务列表</h2>
<ul>
  <li><input type="checkbox" disabled> 待办事项</li>
  <li><input type="checkbox" checked disabled> 已完成事项</li>
  <li><input type="checkbox" disabled> 另一个待办事项</li>
</ul>

<h2>嵌套任务列表</h2>
<ul>
  <li><input type="checkbox" checked disabled> 完成的主任务
    <ul>
      <li><input type="checkbox" checked disabled> 完成的子任务</li>
      <li><input type="checkbox" disabled> 未完成的子任务</li>
    </ul>
  </li>
  <li><input type="checkbox" disabled> 未完成的主任务
    <ul>
      <li><input type="checkbox" disabled> 子任务 1</li>
      <li><input type="checkbox" disabled> 子任务 2</li>
    </ul>
  </li>
</ul>

<h2>任务列表与格式化</h2>
<ul>
  <li><input type="checkbox" checked disabled> 支持 <strong>加粗</strong> 和 <em>斜体</em></li>
  <li><input type="checkbox" disabled> 支持 <code>行内代码</code></li>
  <li><input type="checkbox" disabled> 支持 <a href="https://example.com">链接</a></li>
</ul>`
  },
  {
    id: 'strikethrough',
    name: '删除线',
    content: `<h1>删除线（Strikethrough）</h1>
<p>删除线是 GitHub Flavored Markdown 的扩展语法。</p>

<h2>基础删除线</h2>
<p>这是 <del>被删除的文本</del> 和正常文本。</p>

<h2>删除线与其他格式化</h2>
<p>可以组合使用：</p>
<ul>
  <li><del>删除线</del> 和 <strong>加粗</strong></li>
  <li><del>删除线</del> 和 <em>斜体</em></li>
  <li><del>删除线</del> 和 <code>行内代码</code></li>
  <li><del><strong>删除的加粗文本</strong></del></li>
  <li><del><em>删除的斜体文本</em></del></li>
</ul>

<h2>实际应用</h2>
<p>删除线常用于：</p>
<ul>
  <li>显示 <del>旧价格 ¥999</del> 新价格 ¥799</li>
  <li>标记 <del>已完成</del> 或 <del>已取消</del> 的任务</li>
  <li>显示 <del>过时的信息</del> 更新的内容</li>
</ul>`
  },
  {
    id: 'comparison',
    name: '比较运算符处理',
    content: `<h1>比较运算符处理</h1>
<p>Markdown River 的核心特性：智能区分 HTML 标签和比较运算符。</p>

<h2>数学比较</h2>
<p>常见的比较：a < b, x > y, 5 <= 10, 8 >= 3</p>
<p>价格比较：价格 < 100 元，优惠 > 50%</p>
<p>复杂表达式：if (x < 10 && y > 20)</p>

<h2>在代码块中</h2>
<pre><code>// 代码块中的比较运算符
if (index < array.length) {
  console.log(array[index]);
}

// 更复杂的例子
while (i < n && j < m) {
  if (arr1[i] < arr2[j]) {
    result.push(arr1[i++]);
  }
}</code></pre>

<h2>混合场景</h2>
<p>当 <code>a < b</code> 时，执行 <strong>特定操作</strong>。</p>
<p>HTML 标签 <em>正常工作</em>，而 < 和 > 作为普通字符显示。</p>

<h2>流式渲染中的挑战</h2>
<p>在流式输出中，需要智能判断：</p>
<ul>
  <li><code>&lt;</code> 是 HTML 标签的开始还是比较运算符</li>
  <li><code>&gt;</code> 是 HTML 标签的结束还是比较运算符</li>
  <li>不完整的标签如 <code>&lt;/pr</code> 的处理</li>
</ul>`
  },
  {
    id: 'html-entities',
    name: 'HTML 实体/转义字符',
    content: `<h1>HTML 实体与转义字符处理</h1>
<p>Markdown River 正确处理各种 HTML 实体和转义字符，确保内容安全显示。</p>

<h2>基础转义字符</h2>
<p>常见的 HTML 转义字符：</p>
<ul>
  <li><code>&amp;lt;</code> → &lt; (小于号)</li>
  <li><code>&amp;gt;</code> → &gt; (大于号)</li>
  <li><code>&amp;amp;</code> → &amp; (和号)</li>
  <li><code>&amp;quot;</code> → &quot; (双引号)</li>
  <li><code>&amp;apos;</code> → &apos; (单引号)</li>
</ul>

<h2>特殊符号实体</h2>
<p>版权和商标符号：</p>
<ul>
  <li><code>&amp;copy;</code> → &copy; (版权符号)</li>
  <li><code>&amp;reg;</code> → &reg; (注册商标)</li>
  <li><code>&amp;trade;</code> → &trade; (商标符号)</li>
  <li><code>&amp;nbsp;</code> → &nbsp; (不换行空格)</li>
</ul>

<h2>数学和特殊字符</h2>
<p>数学符号：</p>
<ul>
  <li><code>&amp;plusmn;</code> → &plusmn; (正负号)</li>
  <li><code>&amp;times;</code> → &times; (乘号)</li>
  <li><code>&amp;divide;</code> → &divide; (除号)</li>
  <li><code>&amp;ne;</code> → &ne; (不等于)</li>
  <li><code>&amp;le;</code> → &le; (小于等于)</li>
  <li><code>&amp;ge;</code> → &ge; (大于等于)</li>
</ul>

<h2>扑克牌花色</h2>
<p>扑克牌符号：</p>
<ul>
  <li><code>&amp;spades;</code> → &spades; (黑桃)</li>
  <li><code>&amp;clubs;</code> → &clubs; (梅花)</li>
  <li><code>&amp;hearts;</code> → &hearts; (红心)</li>
  <li><code>&amp;diams;</code> → &diams; (方块)</li>
</ul>

<h2>希腊字母</h2>
<p>常用希腊字母：</p>
<ul>
  <li><code>&amp;alpha;</code> → &alpha;</li>
  <li><code>&amp;beta;</code> → &beta;</li>
  <li><code>&amp;gamma;</code> → &gamma;</li>
  <li><code>&amp;delta;</code> → &delta;</li>
  <li><code>&amp;pi;</code> → &pi;</li>
  <li><code>&amp;sigma;</code> → &sigma;</li>
  <li><code>&amp;omega;</code> → &omega;</li>
</ul>

<h2>代码块中的转义</h2>
<p>在代码块中，HTML 标签必须转义：</p>
<pre><code class="language-html">&lt;!DOCTYPE html&gt;
&lt;html lang="zh-CN"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;示例页面&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;欢迎使用 Markdown River&lt;/h1&gt;
  &lt;p&gt;处理 &amp;lt; 和 &amp;gt; 字符的示例&lt;/p&gt;
  &lt;script&gt;
    if (a &lt; b &amp;&amp; b &gt; c) {
      console.log('比较运算符示例');
    }
  &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>

<h2>混合场景</h2>
<p>在普通文本中，比较运算符无需转义：</p>
<p>价格对比：原价 &lt; 100 元 &amp; 现价 &gt; 50 元</p>
<p>而 HTML 标签会被正确解析：<strong>加粗文本</strong> 和 <em>斜体文本</em></p>

<h2>数字字符引用</h2>
<p>数字形式的字符实体：</p>
<ul>
  <li><code>&amp;#60;</code> → &#60; (小于号)</li>
  <li><code>&amp;#62;</code> → &#62; (大于号)</li>
  <li><code>&amp;#38;</code> → &#38; (和号)</li>
  <li><code>&amp;#8364;</code> → &#8364; (欧元符号)</li>
</ul>

<p><small>💡 Markdown River 能够智能区分需要转义的场景和普通文本场景，确保内容的正确显示。</small></p>`
  }
];

function App() {
  const [speed, setSpeed] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedExample, setSelectedExample] = useState(examples[0]);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const riverRef = useRef<MarkdownRiver | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);

  // 初始化 MarkdownRiver
  useEffect(() => {
    const river = new MarkdownRiver();
    riverRef.current = river;

    // 注册监听器
    river.onHtmlUpdate((html) => {
      setHtmlContent(html);
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 当选择的示例改变时，立即开始新的演示
  useEffect(() => {
    startDemo();
  }, [selectedExample]);

  const startDemo = useCallback(() => {
    if (riverRef.current) {
      // 先停止当前正在进行的演示
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // 重播状态
      riverRef.current.reset();
      currentIndexRef.current = 0;
      setIsPlaying(true);
      setIsCompleted(false);

      const content = selectedExample.content;
      
      const startInterval = () => {
        intervalRef.current = window.setInterval(() => {
          if (currentIndexRef.current < content.length) {
            riverRef.current!.write(content[currentIndexRef.current]);
            currentIndexRef.current++;
          } else {
            // 完成后停止
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setIsPlaying(false);
            setIsCompleted(true);
          }
        }, speed);
      };

      startInterval();
    }
  }, [speed, selectedExample]);

  const pauseDemo = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const resumeDemo = useCallback(() => {
    if (!isPlaying && riverRef.current) {
      setIsPlaying(true);
      
      const content = selectedExample.content;
      
      intervalRef.current = window.setInterval(() => {
        if (currentIndexRef.current < content.length) {
          riverRef.current!.write(content[currentIndexRef.current]);
          currentIndexRef.current++;
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          setIsCompleted(true);
        }
      }, speed);
    }
  }, [speed, isPlaying, selectedExample]);

  const resetDemo = useCallback(() => {
    pauseDemo();
    startDemo();
  }, [pauseDemo, startDemo]);


  // 速度变化时更新定时器
  useEffect(() => {
    if (isPlaying && intervalRef.current) {
      clearInterval(intervalRef.current);
      
      const content = selectedExample.content;
      
      intervalRef.current = window.setInterval(() => {
        if (currentIndexRef.current < content.length) {
          riverRef.current!.write(content[currentIndexRef.current]);
          currentIndexRef.current++;
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
          setIsCompleted(true);
        }
      }, speed);
    }
  }, [speed, selectedExample]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">
                Markdown River Demo
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600">
                流式 HTML 渲染器，专为 AI 聊天设计
              </p>
            </div>
            <a 
              href="https://github.com/yarnovo/markdown-river"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors self-start sm:self-auto"
            >
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* 示例选择 */}
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                选择示例
              </label>
              <Listbox value={selectedExample} onChange={setSelectedExample}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                    <span className="block truncate">{selectedExample.name}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                    {examples.map((example) => (
                      <Listbox.Option
                        key={example.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                          }`
                        }
                        value={example}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {example.name}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* 速度控制 */}
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                速度: {speed}ms
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 播放控制 */}
            <div className="flex gap-2">
              {isPlaying ? (
                <button
                  onClick={pauseDemo}
                  disabled={isCompleted}
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                    isCompleted ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <PauseIcon className="h-5 w-5" />
                  暂停
                </button>
              ) : (
                <button
                  onClick={resumeDemo}
                  disabled={isCompleted}
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                    isCompleted ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <PlayIcon className="h-5 w-5" />
                  继续
                </button>
              )}
              <button
                onClick={resetDemo}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ArrowPathIcon className="h-5 w-5" />
                重播
              </button>
            </div>
          </div>

          {/* 渲染内容 */}
          <div 
            className="prose prose-sm sm:prose-base md:prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;