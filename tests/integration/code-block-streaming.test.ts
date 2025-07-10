import { describe, it, expect, beforeAll } from 'vitest';
import { MarkdownRiver } from '../../src/core/MarkdownRiver';

describe('代码块流式渲染测试', () => {
  beforeAll(() => {
    // Mock document for Node.js environment
    (global as { document?: unknown }).document = {
      createElement: () => ({
        textContent: '',
        innerHTML: '',
      }),
    };
  });

  describe('单个代码块流式输入', () => {
    it('应该正确处理逐字符输入的 JavaScript 代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      // 逐字符模拟输入
      const input = '```javascript\nconst msg = "hello";\nconsole.log(msg);';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      // 验证最终输出
      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">const msg = &quot;hello&quot;;
        console.log(msg);
        </code></pre>
        "
      `);
    });

    it('应该正确处理带语言标识符的代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = '```python\nprint("Hello, World!")';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code class="language-python">print(&quot;Hello, World!&quot;)
        </code></pre>
        "
      `);
    });

    it('应该正确处理无语言标识符的代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = '```\necho "hello"\nls -la';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code>echo &quot;hello&quot;
        ls -la
        </code></pre>
        "
      `);
    });
  });

  describe('混合内容中的代码块', () => {
    it('应该正确处理文本 + 代码块的混合内容', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = `# 代码示例

这里是一个 JavaScript 函数：

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}`;

      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<h1>代码示例</h1>
        <p>这里是一个 JavaScript 函数：</p>
        <pre><code class="language-javascript">function greet(name) {
          return \`Hello, \${name}!\`;
        }
        </code></pre>
        "
      `);
    });

    it('应该正确处理行内代码与代码块的混合', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = `使用 \`console.log()\` 函数输出：

\`\`\`javascript
console.log("Hello World");`;

      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<p>使用 <code>console.log()</code> 函数输出：</p>
        <pre><code class="language-javascript">console.log(&quot;Hello World&quot;);
        </code></pre>
        "
      `);
    });

    it('应该正确处理多个代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = `# 多语言示例

JavaScript:
\`\`\`javascript
const a = 1;
\`\`\`

Python:
\`\`\`python
a = 1`;

      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<h1>多语言示例</h1>
        <p>JavaScript:</p>
        <pre><code class="language-javascript">const a = 1;
        </code></pre>
        <p>Python:</p>
        <pre><code class="language-python">a = 1
        </code></pre>
        "
      `);
    });
  });

  describe('代码块中的特殊字符', () => {
    it('应该正确处理包含引号的代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = '```javascript\nconst msg = "Hello \\"World\\"!";\nconsole.log(msg);';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">const msg = &quot;Hello \\&quot;World\\&quot;!&quot;;
        console.log(msg);
        </code></pre>
        "
      `);
    });

    it('应该正确处理包含 HTML 标签的代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = '```html\n<div class="container">\n  <h1>Title</h1>\n</div>';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code class="language-html">&lt;div class=&quot;container&quot;&gt;
          &lt;h1&gt;Title&lt;/h1&gt;
        &lt;/div&gt;
        </code></pre>
        "
      `);
    });

    it('应该正确处理包含反引号的代码块', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      const input = '```markdown\n使用 `code` 标记\n另一个 `example`';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code class="language-markdown">使用 \`code\` 标记
        另一个 \`example\`
        </code></pre>
        "
      `);
    });
  });

  describe('流式渲染实时性验证', () => {
    it('应该在每次输入后触发解析事件', async () => {
      const river = new MarkdownRiver();
      const parseEvents: Array<{ content: string; html: string }> = [];

      river.on('content:parsed', ({ html, content }) => {
        parseEvents.push({ content, html });
      });

      const input = '```js\nconsole.log("test");';
      for (const char of input) {
        river.write(char);
      }
      river.end();

      // 验证有解析事件触发
      expect(parseEvents.length).toBeGreaterThan(0);

      // 验证最终结果正确
      const lastEvent = parseEvents[parseEvents.length - 1];
      expect(lastEvent.html).toMatchInlineSnapshot(`
        "<pre><code class="language-js">console.log(&quot;test&quot;);
        </code></pre>
        "
      `);
    });

    it('应该正确处理快速连续输入', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      // 快速连续写入多个字符
      const chunks = ['```', 'python', '\n', 'print(', '"hello"', ')'];
      chunks.forEach(chunk => {
        river.write(chunk);
      });
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toMatchInlineSnapshot(`
        "<pre><code class="language-python">print(&quot;hello&quot;)
        </code></pre>
        "
      `);
    });
  });
});
