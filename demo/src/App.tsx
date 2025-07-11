import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarkdownRiver } from 'markdown-river';
import { PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';

// 示例数据
const examples = [
  {
    id: 'welcome',
    name: '欢迎示例',
    content: `<h1>欢迎使用 Markdown River</h1>
<p>这是一个专为 <strong>AI 流式聊天</strong> 设计的 HTML 渲染器。</p>
<p>它能够：</p>
<ul>
  <li>✨ 完美处理流式输出，无闪烁</li>
  <li>🚀 支持 CommonMark 规范</li>
  <li>💪 处理不完整的 HTML 标签</li>
  <li>🎯 专注于 AI 场景优化</li>
</ul>
<p>选择上方的示例，查看更多功能演示！</p>`
  },
  {
    id: 'commonmark',
    name: 'CommonMark 核心功能',
    content: `<h1>CommonMark 核心功能</h1>
<h2>标题层级</h2>
<h3>三级标题</h3>
<h4>四级标题</h4>
<h5>五级标题</h5>
<h6>六级标题</h6>

<h2>段落和换行</h2>
<p>这是第一个段落。段落之间通过空行分隔。</p>
<p>这是第二个段落。<br>
这里使用了换行符。</p>

<h2>文本格式化</h2>
<p>支持 <strong>加粗文本</strong>、<em>斜体文本</em>、<strong><em>加粗斜体</em></strong>。</p>

<h2>链接</h2>
<p>这是一个 <a href="https://github.com">普通链接</a>。</p>
<p>这是一个 <a href="https://example.com" title="示例网站">带标题的链接</a>。</p>

<h2>引用块</h2>
<blockquote>
  <p>这是一个引用块。</p>
  <p>引用块可以包含多个段落。</p>
  <blockquote>
    <p>甚至可以嵌套引用。</p>
  </blockquote>
</blockquote>

<h2>分隔线</h2>
<p>下面是分隔线：</p>
<hr>
<p>分隔线上方和下方的内容。</p>`
  },
  {
    id: 'code',
    name: '代码块演示',
    content: `<h1>代码块演示</h1>
<h2>行内代码</h2>
<p>在文本中使用 <code>const x = 42;</code> 这样的行内代码。</p>

<h2>围栏代码块</h2>
<pre><code class="language-javascript">// JavaScript 示例
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 比较运算符在代码块中正确显示
if (a < b && b < c) {
  console.log('a 是最小值');
}</code></pre>

<pre><code class="language-python"># Python 示例
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)</code></pre>

<pre><code class="language-html">&lt;!-- HTML 示例 --&gt;
&lt;div class="container"&gt;
  &lt;h1&gt;标题&lt;/h1&gt;
  &lt;p&gt;这是一个段落&lt;/p&gt;
&lt;/div&gt;</code></pre>`
  },
  {
    id: 'comparison',
    name: '比较运算符',
    content: `<h1>比较运算符处理</h1>
<p>Markdown River 能够智能区分 HTML 标签和比较运算符。</p>

<h2>数学比较</h2>
<p>常见的比较：a < b, x > y, 5 <= 10, 8 >= 3</p>
<p>价格比较：价格 < 100 元</p>
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
<p>HTML 标签 <em>正常工作</em>，而 < 和 > 作为普通字符显示。</p>`
  },
  {
    id: 'table',
    name: '表格演示',
    content: `<h1>表格演示</h1>
<p>Markdown River 支持 GitHub Flavored Markdown 的表格扩展。</p>

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
    id: 'full',
    name: '完整功能展示',
    content: `<h1>Markdown River - 流式 HTML 渲染器</h1>
<p>这是一个专为 <strong>AI 流式聊天</strong> 设计的 HTML 渲染器，支持 <em>CommonMark</em> 规范及常见扩展。</p>

<h2>文本格式化</h2>
<p>支持 <strong>加粗文本</strong>、<em>斜体文本</em>、<strong><em>加粗斜体</em></strong>、<code>行内代码</code> 和 <del>删除线文本</del>。</p>
<p>还支持 <a href="https://github.com">链接</a> 和 <a href="https://example.com" title="示例网站">带标题的链接</a>。</p>

<h2>段落和换行</h2>
<p>这是第一个段落。段落之间通过空行分隔。</p>
<p>这是第二个段落。<br>
这里使用了换行符。</p>

<h2>引用块</h2>
<blockquote>
  <p>这是一个引用块。可以包含多个段落。</p>
  <p>引用块也支持 <strong>格式化</strong> 和 <code>代码</code>。</p>
  <blockquote>
    <p>嵌套引用也是支持的。</p>
  </blockquote>
</blockquote>

<h2>列表</h2>
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

<h3>任务列表</h3>
<ul>
  <li><input type="checkbox" disabled> 待办事项</li>
  <li><input type="checkbox" checked disabled> 已完成事项</li>
  <li><input type="checkbox" disabled> 另一个待办事项</li>
</ul>

<h2>代码块</h2>
<p>行内代码：<code>const x = 42;</code></p>
<p>围栏代码块：</p>
<pre><code class="language-javascript">// JavaScript 示例
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 比较运算符在代码块中正确显示
if (a < b && b < c) {
  console.log('a 是最小值');
}</code></pre>

<pre><code class="language-python"># Python 示例
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)</code></pre>

<h2>表格</h2>
<table>
  <thead>
    <tr>
      <th>功能</th>
      <th align="center">状态</th>
      <th align="right">版本</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>CommonMark 核心</td>
      <td align="center">✅ 完全支持</td>
      <td align="right">1.0</td>
    </tr>
    <tr>
      <td>表格扩展</td>
      <td align="center">✅ 支持</td>
      <td align="right">1.0</td>
    </tr>
    <tr>
      <td>任务列表</td>
      <td align="center">✅ 支持</td>
      <td align="right">1.0</td>
    </tr>
    <tr>
      <td>删除线</td>
      <td align="center">✅ 支持</td>
      <td align="right">1.0</td>
    </tr>
  </tbody>
</table>

<h2>分隔线</h2>
<p>下面是一条分隔线：</p>
<hr>
<p>分隔线上方和下方的内容。</p>

<h2>HTML 实体和特殊字符</h2>
<p>支持 HTML 实体：&copy; &reg; &trade; &hearts; &spades; &clubs; &diams;</p>
<p>数学比较：a < b, x > y, 5 <= 10, 8 >= 3</p>
<p>特殊字符：& < > " '</p>

<h2>图片</h2>
<p><img src="https://picsum.photos/600/300" alt="随机风景图" title="来自 Lorem Picsum 的随机图片"></p>

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

<h2>总结</h2>
<p>Markdown River 通过智能的 <strong>标签完整性检测</strong>，确保流式渲染时不会出现闪烁或布局跳动，为 AI 对话提供流畅的用户体验。</p>
<p><small>© 2024 Markdown River - 专注于流式渲染的未来</small></p>`
  }
];

function App() {
  const [speed, setSpeed] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedExample, setSelectedExample] = useState(examples[0]);
  
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
      
      // 重置状态
      riverRef.current.reset();
      currentIndexRef.current = 0;
      setIsPlaying(true);

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
        }
      }, speed);
    }
  }, [speed, selectedExample]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Markdown River Demo
          </h1>
          <p className="text-lg text-gray-600">
            流式 HTML 渲染器，专为 AI 聊天设计
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* 示例选择 */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <PauseIcon className="h-5 w-5" />
                  暂停
                </button>
              ) : (
                <button
                  onClick={resumeDemo}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
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
                重置
              </button>
            </div>
          </div>

          {/* 渲染内容 */}
          <div 
            className="markdown-content prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;