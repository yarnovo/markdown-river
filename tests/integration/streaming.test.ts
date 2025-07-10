import { describe, it, expect, vi } from 'vitest';
import { MarkdownRiver } from '../../src';
import { commonMarkFullDocument } from '@markdown-river/test-suite';

describe('Streaming Integration Tests', () => {
  describe('典型 CommonMark 场景快照测试', () => {
    it('标题的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // ATX 标题
      river.write('#');
      river.write(' ');
      river.write('H');
      river.write('e');
      river.write('l');
      river.write('l');
      river.write('o');
      river.end();

      // 最终结果快照
      expect(results[results.length - 1].html).toMatchInlineSnapshot(`"<h1>Hello</h1>\n"`);
    });

    it('行内代码的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 行内代码
      river.write('`');
      river.write('c');
      river.write('o');
      river.write('d');
      river.write('e');
      river.write('`');
      river.end();

      // 最终结果快照
      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<p><code>code</code></p>\n"`
      );
    });

    it('列表项的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 无序列表
      river.write('-');
      river.write(' ');
      river.write('I');
      river.write('t');
      river.write('e');
      river.write('m');
      river.end();

      // 最终结果快照
      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<ul>\n<li>Item</li>\n</ul>\n"`
      );
    });

    it('强调格式的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 加粗文本
      river.write('*');
      river.write('*');
      river.write('b');
      river.write('o');
      river.write('l');
      river.write('d');
      river.write('*');
      river.write('*');
      river.end();

      // 最终结果快照
      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<p><strong>bold</strong></p>\n"`
      );
    });

    it('代码块的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 围栏代码块
      river.write('`');
      river.write('`');
      river.write('`');
      river.write('j');
      river.write('s');
      river.write('\n');
      river.write('c');
      river.write('o');
      river.write('n');
      river.write('s');
      river.write('t');
      river.write(' ');
      river.write('x');
      river.write(' ');
      river.write('=');
      river.write(' ');
      river.write('1');
      river.write(';');
      river.write('\n');
      river.write('`');
      river.write('`');
      river.write('`');
      river.end();

      // 最终结果快照
      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<pre><code class="language-js">const x = 1;\n</code></pre>\n"`
      );
    });

    it('混合格式的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 混合格式文本
      const text = '**Bold** and *italic* with `code`';
      for (const char of text) {
        river.write(char);
      }
      river.end();

      // 最终结果快照
      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<p><strong>Bold</strong> and <em>italic</em> with <code>code</code></p>\n"`
      );
    });
  });

  describe('策略决策测试', () => {
    it('未闭合的行内代码', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('`code');

      // 乐观更新：应该自动补全代码
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '`code`',
          html: '<p><code>code</code></p>\n',
        })
      );

      river.write('`');
      river.end();

      // 第二次写入会触发新的解析
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('未闭合的强调标记', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('**bold');

      // 乐观更新：应该自动补全强调
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '**bold**',
          html: '<p><strong>bold</strong></p>\n',
        })
      );

      river.write('**');
      river.end();

      // 第二次写入会触发新的解析
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('代码块标记的策略决策', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('```');
      river.write('js\n');
      river.write('code\n');
      river.write('```');
      river.end();

      // 检查最终结果
      expect(handler).toHaveBeenCalled();
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0];
      expect(lastCall.html).toMatchInlineSnapshot(
        `"<pre><code class="language-js">code\n</code></pre>\n"`
      );
    });
  });

  describe('复杂场景测试', () => {
    it('嵌套格式的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 嵌套的加粗和斜体
      const text = '**Bold with *nested italic* text**';
      for (const char of text) {
        river.write(char);
      }
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<p><strong>Bold with <em>nested italic</em> text</strong></p>\n"`
      );
    });

    it('多段落的流式解析', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('First paragraph.\n\n');
      river.write('Second paragraph.\n\n');
      river.write('Third paragraph.');
      river.end();

      expect(handler).toHaveBeenCalled();
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0];
      expect(lastCall.html).toMatchInlineSnapshot(
        `"<p>First paragraph.</p>\n<p>Second paragraph.</p>\n<p>Third paragraph.</p>\n"`
      );
    });

    it('列表的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 有序列表
      river.write('1. First\n');
      river.write('2. Second\n');
      river.write('3. Third');
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<ol>\n<li>First</li>\n<li>Second</li>\n<li>Third</li>\n</ol>\n"`
      );
    });

    it('引用块的流式解析', () => {
      const river = new MarkdownRiver({
        markedOptions: { breaks: true },
      });
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 引用块
      river.write('> Quote line 1\n');
      river.write('> Quote line 2');
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<blockquote>\n<p>Quote line 1<br>Quote line 2</p>\n</blockquote>\n"`
      );
    });

    it('链接的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 内联链接
      const text = '[Link text](https://example.com)';
      for (const char of text) {
        river.write(char);
      }
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<p><a href="https://example.com">Link text</a></p>\n"`
      );
    });

    it('图片的流式解析', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 图片
      const text = '![Alt text](image.jpg)';
      for (const char of text) {
        river.write(char);
      }
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<p><img src="image.jpg" alt="Alt text"></p>\n"`
      );
    });

    it('表格的流式解析（GFM）', () => {
      const river = new MarkdownRiver({
        markedOptions: { gfm: true },
      });
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 表格
      river.write('| Header 1 | Header 2 |\n');
      river.write('|----------|----------|\n');
      river.write('| Cell 1   | Cell 2   |');
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(
        `"<table>
<thead>
<tr>
<th>Header 1</th>
<th>Header 2</th>
</tr>
</thead>
<tbody><tr>
<td>Cell 1</td>
<td>Cell 2</td>
</tr>
</tbody></table>
"`
      );
    });
  });

  describe('边界情况测试', () => {
    it('空内容', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('');
      river.end();

      // 空内容可能不会触发事件，检查是否没有被调用
      if (handler.mock.calls.length === 0) {
        expect(handler).not.toHaveBeenCalled();
      } else {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            html: '',
            content: '',
          })
        );
      }
    });

    it('只有格式标记', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('****');
      river.end();

      expect(handler).toHaveBeenCalled();
      // marked 将 **** 解析为水平线
      expect(handler.mock.calls[0][0].html).toMatchInlineSnapshot(`"<hr>\n"`);
    });

    it('转义字符', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      river.write('\\*not italic\\*');
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(`"<p>*not italic*</p>\n"`);
    });

    it('HTML 实体', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      river.write('&lt;div&gt;');
      river.end();

      expect(results[results.length - 1].html).toMatchInlineSnapshot(`"<p>&lt;div&gt;</p>\n"`);
    });
  });

  describe('完整文档测试', () => {
    it('使用 test-suite 的完整文档进行流式测试', async () => {
      const river = new MarkdownRiver({
        markedOptions: { gfm: true, breaks: true },
      });
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // 模拟逐字符流式输入
      let index = 0;
      const chunkSize = 10; // 每次写入10个字符

      while (index < commonMarkFullDocument.length) {
        const chunk = commonMarkFullDocument.slice(index, index + chunkSize);
        river.write(chunk);
        index += chunkSize;

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      river.end();

      // 检查最终结果包含关键元素
      const finalHtml = results[results.length - 1].html;

      // 找到包含行内代码的文档部分
      const codeIndex = commonMarkFullDocument.indexOf('使用 `反引号` 创建行内代码');
      console.log('Code section at index:', codeIndex);

      // 获取最后处理的内容
      const lastContent = results[results.length - 1].content;
      console.log('Last processed content:', lastContent.slice(-50));

      expect(finalHtml).toContain('<h1>');
      expect(finalHtml).toContain('<h2>');
      expect(finalHtml).toContain('<strong>');
      expect(finalHtml).toContain('<em>');
      expect(finalHtml).toContain('<code>');
      expect(finalHtml).toContain('<pre>');
      expect(finalHtml).toContain('<ul>');
      expect(finalHtml).toContain('<ol>');
      expect(finalHtml).toContain('<blockquote>');
      expect(finalHtml).toContain('<table>');

      // 解析次数应该合理（不是每个字符都触发）
      expect(results.length).toBeGreaterThan(1);
      expect(results.length).toBeLessThan(commonMarkFullDocument.length / 2);
    });
  });
});
