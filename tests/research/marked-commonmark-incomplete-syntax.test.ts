import { describe, it, expect } from 'vitest';
import { marked } from 'marked';

/**
 * 研究测试：marked 库对 CommonMark 各种未完成语法的处理行为
 *
 * 目的：了解 marked 如何处理流式输入中的各种未完成的 Markdown 语法
 * 这对于我们的流式渲染器的歧义检测策略至关重要
 *
 * 使用内联快照来记录 marked 的实际行为
 */

describe('Marked 库 CommonMark 未完成语法处理研究', () => {
  // 使用同步版本的 marked.parse
  const parse = (input: string): string => marked.parse(input, { async: false }) as string;

  describe('块级元素', () => {
    describe('标题（Headings）', () => {
      it('ATX 标题 - 未完成的井号', () => {
        expect(parse('#')).toMatchInlineSnapshot(`
          "<h1></h1>
          "
        `);
        expect(parse('# ')).toMatchInlineSnapshot(`
          "<h1></h1>
          "
        `);
        expect(parse('# H')).toMatchInlineSnapshot(`
          "<h1>H</h1>
          "
        `);
        expect(parse('## ')).toMatchInlineSnapshot(`
          "<h2></h2>
          "
        `);
        expect(parse('### T')).toMatchInlineSnapshot(`
          "<h3>T</h3>
          "
        `);
      });

      it('Setext 标题 - 未完成的下划线', () => {
        expect(parse('Title\n=')).toMatchInlineSnapshot(`
          "<h1>Title</h1>
          "
        `);
        expect(parse('Title\n==')).toMatchInlineSnapshot(`
          "<h1>Title</h1>
          "
        `);
        expect(parse('Title\n-')).toMatchInlineSnapshot(`
          "<h2>Title</h2>
          "
        `);
        expect(parse('Title\n--')).toMatchInlineSnapshot(`
          "<h2>Title</h2>
          "
        `);
        expect(parse('Title')).toMatchInlineSnapshot(`
          "<p>Title</p>
          "
        `);
      });
    });

    describe('代码块（Code Blocks）', () => {
      it('围栏代码块 - 各种未闭合情况', () => {
        expect(parse('```')).toMatchInlineSnapshot(`
          "<pre><code>
          </code></pre>
          "
        `);
        expect(parse('```javascript')).toMatchInlineSnapshot(`
          "<pre><code class="language-javascript">
          </code></pre>
          "
        `);
        expect(parse('```javascript\nconst a = 1;')).toMatchInlineSnapshot(`
          "<pre><code class="language-javascript">const a = 1;
          </code></pre>
          "
        `);
        expect(parse('```\ncode\n``')).toMatchInlineSnapshot(`
          "<pre><code>code
          \`\`
          </code></pre>
          "
        `);
      });

      it('缩进代码块 - 未完成的缩进', () => {
        expect(parse('    code')).toMatchInlineSnapshot(`
          "<pre><code>code
          </code></pre>
          "
        `);
        expect(parse('   code')).toMatchInlineSnapshot(`
          "<p>   code</p>
          "
        `);
        expect(parse('\tcode')).toMatchInlineSnapshot(`
          "<pre><code>code
          </code></pre>
          "
        `);
      });
    });

    describe('列表（Lists）', () => {
      it('无序列表 - 各种未完成情况', () => {
        expect(parse('-')).toMatchInlineSnapshot(`
          "<ul>
          <li></li>
          </ul>
          "
        `);
        expect(parse('- ')).toMatchInlineSnapshot(`
          "<p>- </p>
          "
        `);
        expect(parse('- item')).toMatchInlineSnapshot(`
          "<ul>
          <li>item</li>
          </ul>
          "
        `);
        expect(parse('*')).toMatchInlineSnapshot(`
          "<ul>
          <li></li>
          </ul>
          "
        `);
        expect(parse('* ')).toMatchInlineSnapshot(`
          "<p>* </p>
          "
        `);
        expect(parse('+ ')).toMatchInlineSnapshot(`
          "<p>+ </p>
          "
        `);
      });

      it('有序列表 - 各种未完成情况', () => {
        expect(parse('1')).toMatchInlineSnapshot(`
          "<p>1</p>
          "
        `);
        expect(parse('1.')).toMatchInlineSnapshot(`
          "<ol>
          <li></li>
          </ol>
          "
        `);
        expect(parse('1. ')).toMatchInlineSnapshot(`
          "<p>1. </p>
          "
        `);
        expect(parse('1. item')).toMatchInlineSnapshot(`
          "<ol>
          <li>item</li>
          </ol>
          "
        `);
        expect(parse('10. ')).toMatchInlineSnapshot(`
          "<p>10. </p>
          "
        `);
      });

      it('嵌套列表 - 未完成的缩进', () => {
        expect(parse('- item\n  -')).toMatchInlineSnapshot(`
          "<ul>
          <li><h2>item</h2>
          </li>
          </ul>
          "
        `);
        expect(parse('- item\n  - ')).toMatchInlineSnapshot(`
          "<ul>
          <li><h2>item</h2>
          </li>
          </ul>
          "
        `);
      });
    });

    describe('引用块（Blockquotes）', () => {
      it('引用块 - 各种未完成情况', () => {
        expect(parse('>')).toMatchInlineSnapshot(`
          "<blockquote>
          </blockquote>
          "
        `);
        expect(parse('> ')).toMatchInlineSnapshot(`
          "<blockquote>
          </blockquote>
          "
        `);
        expect(parse('> text')).toMatchInlineSnapshot(`
          "<blockquote>
          <p>text</p>
          </blockquote>
          "
        `);
        expect(parse('> line1\n>')).toMatchInlineSnapshot(`
          "<blockquote>
          <p>line1</p>
          </blockquote>
          "
        `);
      });

      it('嵌套引用块', () => {
        expect(parse('> > nested')).toMatchInlineSnapshot(`
          "<blockquote>
          <blockquote>
          <p>nested</p>
          </blockquote>
          </blockquote>
          "
        `);
        expect(parse('> >')).toMatchInlineSnapshot(`
          "<blockquote>
          <blockquote>
          </blockquote>
          </blockquote>
          "
        `);
      });
    });

    describe('分隔线（Horizontal Rules）', () => {
      it('分隔线 - 未完成的标记', () => {
        expect(parse('-')).toMatchInlineSnapshot(`
          "<ul>
          <li></li>
          </ul>
          "
        `);
        expect(parse('--')).toMatchInlineSnapshot(`
          "<p>--</p>
          "
        `);
        expect(parse('---')).toMatchInlineSnapshot(`
          "<hr>
          "
        `);
        expect(parse('***')).toMatchInlineSnapshot(`
          "<hr>
          "
        `);
        expect(parse('___')).toMatchInlineSnapshot(`
          "<hr>
          "
        `);
        expect(parse('**')).toMatchInlineSnapshot(`
          "<p>**</p>
          "
        `);
        expect(parse('__')).toMatchInlineSnapshot(`
          "<p>__</p>
          "
        `);
      });
    });
  });

  describe('行内元素', () => {
    describe('强调（Emphasis）', () => {
      it('斜体 - 未闭合的星号', () => {
        expect(parse('*text')).toMatchInlineSnapshot(`
          "<p>*text</p>
          "
        `);
        expect(parse('*text*')).toMatchInlineSnapshot(`
          "<p><em>text</em></p>
          "
        `);
        expect(parse('_text')).toMatchInlineSnapshot(`
          "<p>_text</p>
          "
        `);
        expect(parse('_text_')).toMatchInlineSnapshot(`
          "<p><em>text</em></p>
          "
        `);
      });

      it('加粗 - 未闭合的双星号', () => {
        expect(parse('**text')).toMatchInlineSnapshot(`
          "<p>**text</p>
          "
        `);
        expect(parse('**text**')).toMatchInlineSnapshot(`
          "<p><strong>text</strong></p>
          "
        `);
        expect(parse('__text')).toMatchInlineSnapshot(`
          "<p>__text</p>
          "
        `);
        expect(parse('__text__')).toMatchInlineSnapshot(`
          "<p><strong>text</strong></p>
          "
        `);
        expect(parse('**text*')).toMatchInlineSnapshot(`
          "<p>*<em>text</em></p>
          "
        `);
      });

      it('嵌套强调 - 复杂情况', () => {
        expect(parse('***text')).toMatchInlineSnapshot(`
          "<p>***text</p>
          "
        `);
        expect(parse('***text***')).toMatchInlineSnapshot(`
          "<p><em><strong>text</strong></em></p>
          "
        `);
        expect(parse('**_text')).toMatchInlineSnapshot(`
          "<p>**_text</p>
          "
        `);
        expect(parse('**_text_**')).toMatchInlineSnapshot(`
          "<p><strong><em>text</em></strong></p>
          "
        `);
      });
    });

    describe('行内代码（Code Spans）', () => {
      it('行内代码 - 未闭合的反引号', () => {
        expect(parse('`code')).toMatchInlineSnapshot(`
          "<p>\`code</p>
          "
        `);
        expect(parse('`code`')).toMatchInlineSnapshot(`
          "<p><code>code</code></p>
          "
        `);
        expect(parse('``code')).toMatchInlineSnapshot(`
          "<p>\`\`code</p>
          "
        `);
        expect(parse('``code``')).toMatchInlineSnapshot(`
          "<p><code>code</code></p>
          "
        `);
        expect(parse('`` ` ``')).toMatchInlineSnapshot(`
          "<p><code>\`</code></p>
          "
        `);
      });
    });

    describe('链接（Links）', () => {
      it('链接 - 各种未完成情况', () => {
        expect(parse('[')).toMatchInlineSnapshot(`
          "<p>[</p>
          "
        `);
        expect(parse('[text')).toMatchInlineSnapshot(`
          "<p>[text</p>
          "
        `);
        expect(parse('[text]')).toMatchInlineSnapshot(`
          "<p>[text]</p>
          "
        `);
        expect(parse('[text](')).toMatchInlineSnapshot(`
          "<p>[text](</p>
          "
        `);
        expect(parse('[text](url')).toMatchInlineSnapshot(`
          "<p>[text](url</p>
          "
        `);
        expect(parse('[text](url)')).toMatchInlineSnapshot(`
          "<p><a href="url">text</a></p>
          "
        `);
      });

      it('引用链接 - 未完成情况', () => {
        expect(parse('[text][')).toMatchInlineSnapshot(`
          "<p>[text][</p>
          "
        `);
        expect(parse('[text][ref')).toMatchInlineSnapshot(`
          "<p>[text][ref</p>
          "
        `);
        expect(parse('[text][ref]')).toMatchInlineSnapshot(`
          "<p>[text][ref]</p>
          "
        `);
        expect(parse('[text][]')).toMatchInlineSnapshot(`
          "<p>[text][]</p>
          "
        `);
      });
    });

    describe('图片（Images）', () => {
      it('图片 - 各种未完成情况', () => {
        expect(parse('!')).toMatchInlineSnapshot(`
          "<p>!</p>
          "
        `);
        expect(parse('![')).toMatchInlineSnapshot(`
          "<p>![</p>
          "
        `);
        expect(parse('![alt')).toMatchInlineSnapshot(`
          "<p>![alt</p>
          "
        `);
        expect(parse('![alt]')).toMatchInlineSnapshot(`
          "<p>![alt]</p>
          "
        `);
        expect(parse('![alt](')).toMatchInlineSnapshot(`
          "<p>![alt](</p>
          "
        `);
        expect(parse('![alt](url')).toMatchInlineSnapshot(`
          "<p>![alt](url</p>
          "
        `);
        expect(parse('![alt](url)')).toMatchInlineSnapshot(`
          "<p><img src="url" alt="alt"></p>
          "
        `);
      });
    });
  });

  describe('特殊情况和边界条件', () => {
    it('转义字符 - 未完成的反斜杠', () => {
      expect(parse('\\')).toMatchInlineSnapshot(`
        "<p>\\</p>
        "
      `);
      expect(parse('\\*')).toMatchInlineSnapshot(`
        "<p>*</p>
        "
      `);
      expect(parse('\\[')).toMatchInlineSnapshot(`
        "<p>[</p>
        "
      `);
      expect(parse('\\`')).toMatchInlineSnapshot(`
        "<p>\`</p>
        "
      `);
    });

    it('HTML 标签 - 未闭合', () => {
      expect(parse('<div')).toMatchInlineSnapshot(`
        "<p>&lt;div</p>
        "
      `);
      expect(parse('<div>')).toMatchInlineSnapshot(`"<div>"`);
      expect(parse('<div>content')).toMatchInlineSnapshot(`"<div>content"`);
      expect(parse('<div>content</div>')).toMatchInlineSnapshot(`"<div>content</div>"`);
    });

    it('混合内容 - 块级和行内元素交织', () => {
      expect(parse('# Title\n\n```js\ncode')).toMatchInlineSnapshot(`
        "<h1>Title</h1>
        <pre><code class="language-js">code
        </code></pre>
        "
      `);
      expect(parse('- item\n\n**bold')).toMatchInlineSnapshot(`
        "<ul>
        <li>item</li>
        </ul>
        <p>**bold</p>
        "
      `);
      expect(parse('> quote\n> **bold')).toMatchInlineSnapshot(`
        "<blockquote>
        <p>quote
        **bold</p>
        </blockquote>
        "
      `);
    });
  });

  describe('对流式渲染的启示', () => {
    it('关键发现总结', () => {
      // 这个测试用于记录我们的发现
      console.log('\n=== 流式渲染歧义检测策略总结 ===');
      console.log('运行测试后，通过内联快照可以看到：');
      console.log('1. marked 对块级元素的处理规律');
      console.log('2. marked 对行内元素的处理规律');
      console.log('3. 哪些语法需要等待闭合，哪些可以立即处理');
      console.log('\n请查看生成的快照来了解具体行为！');
    });
  });
});
