import { describe, it, expect, beforeAll } from 'vitest';
import { Marked } from 'marked';

describe('Marked 库对不完全代码块的解析行为调研', () => {
  let marked: Marked;

  beforeAll(() => {
    // Mock document for Node.js environment
    (global as { document?: unknown }).document = {
      createElement: () => ({
        textContent: '',
        innerHTML: '',
      }),
    };

    marked = new Marked();
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  });

  describe('不完全代码块测试', () => {
    it('只有开始标记 ```', () => {
      const content = '```';
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<pre><code>
        </code></pre>
        "
      `);
    });

    it('开始标记 + 语言标识', () => {
      const content = '```javascript';
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">
        </code></pre>
        "
      `);
    });

    it('开始标记 + 语言标识 + 换行', () => {
      const content = '```javascript\n';
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">
        </code></pre>
        "
      `);
    });

    it('开始标记 + 语言标识 + 部分代码', () => {
      const content = '```javascript\nconst a = 1;';
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">const a = 1;
        </code></pre>
        "
      `);
    });

    it('开始标记 + 语言标识 + 多行代码', () => {
      const content = '```javascript\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);';
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">const a = 1;
        const b = 2;
        console.log(a + b);
        </code></pre>
        "
      `);
    });

    it('多行文本 + 不完全代码块', () => {
      const content = `# 标题

这是一些文本。

\`\`\`javascript
const hello = "world";`;
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<h1>标题</h1>
        <p>这是一些文本。</p>
        <pre><code class="language-javascript">const hello = &quot;world&quot;;
        </code></pre>
        "
      `);
    });
  });

  describe('核心发现', () => {
    it('Marked 库自动处理未闭合代码块', () => {
      // 关键发现：Marked 库会自动将未闭合的代码块视为完整代码块
      const incompleteCodeBlock = '```javascript\nconst a = 1;\nconst b = 2;';
      const result = marked.parse(incompleteCodeBlock) as string;

      expect(result).toMatchInlineSnapshot(`
        "<pre><code class="language-javascript">const a = 1;
        const b = 2;
        </code></pre>
        "
      `);

      // 验证：不需要等待闭合标签，Marked 就能正确渲染代码块
      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
      expect(result).toContain('class="language-javascript"');
      expect(result).toContain('const a = 1');
      expect(result).toContain('const b = 2');
    });

    it('混合内容中的未闭合代码块', () => {
      const content = `# 标题

这是一些文本。

\`\`\`javascript
const hello = "world";`;
      const result = marked.parse(content) as string;

      expect(result).toMatchInlineSnapshot(`
        "<h1>标题</h1>
        <p>这是一些文本。</p>
        <pre><code class="language-javascript">const hello = &quot;world&quot;;
        </code></pre>
        "
      `);

      // 验证：混合内容中的未闭合代码块也能正确渲染
      expect(result).toContain('<h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('<pre>');
      expect(result).toContain('const hello');
    });
  });
});
