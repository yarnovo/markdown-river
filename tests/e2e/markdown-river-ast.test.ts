import { describe, it, expect } from 'vitest';
import { MarkdownRiver } from '../../src/core/MarkdownRiver.js';
import type { Tree } from '@lezer/common';

/**
 * 将 AST 转换为可读的字符串格式
 */
function treeToString(tree: Tree, input: string): string {
  const lines: string[] = [];

  tree.iterate({
    enter(node) {
      const indent = '  '.repeat(lines.filter(l => l.includes('├')).length);
      const content = input.slice(node.from, node.to);
      const preview = content.length > 20 ? content.slice(0, 20) + '...' : content;
      lines.push(
        `${indent}├─ ${node.name} [${node.from}-${node.to}]: "${preview.replace(/\n/g, '\\n')}"`
      );
    },
    leave(_node) {
      // 可以在这里添加离开节点的逻辑
    },
  });

  return lines.join('\n');
}

describe('MarkdownRiver - AST 增量解析测试', () => {
  it('应该增量解析普通文本', () => {
    const river = new MarkdownRiver();

    // 第一次写入
    const result1 = river.write('Hello');
    expect(treeToString(result1.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-5]: "Hello"
        ├─ Paragraph [0-5]: "Hello""
    `);

    // 第二次写入，增量解析
    const result2 = river.write(' world');
    expect(treeToString(result2.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-11]: "Hello world"
        ├─ Paragraph [0-11]: "Hello world""
    `);
  });

  it('应该增量解析标题', () => {
    const river = new MarkdownRiver();

    const result1 = river.write('#');
    expect(treeToString(result1.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-1]: "#"
        ├─ ATXHeading1 [0-1]: "#"
          ├─ HeaderMark [0-1]: "#""
    `);

    const result2 = river.write(' ');
    expect(treeToString(result2.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-2]: "# "
        ├─ ATXHeading1 [0-2]: "# "
          ├─ HeaderMark [0-1]: "#""
    `);

    const result3 = river.write('Title');
    expect(treeToString(result3.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-7]: "# Title"
        ├─ ATXHeading1 [0-7]: "# Title"
          ├─ HeaderMark [0-1]: "#""
    `);
  });

  it('应该增量解析强调格式', () => {
    const river = new MarkdownRiver();

    const result1 = river.write('This is ');
    expect(treeToString(result1.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-8]: "This is "
        ├─ Paragraph [0-8]: "This is ""
    `);

    const result2 = river.write('*');
    expect(treeToString(result2.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-9]: "This is *"
        ├─ Paragraph [0-9]: "This is *""
    `);

    const result3 = river.write('emphasis');
    expect(treeToString(result3.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-17]: "This is *emphasis"
        ├─ Paragraph [0-17]: "This is *emphasis""
    `);

    const result4 = river.write('*');
    expect(treeToString(result4.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-18]: "This is *emphasis*"
        ├─ Paragraph [0-18]: "This is *emphasis*"
          ├─ Emphasis [8-18]: "*emphasis*"
            ├─ EmphasisMark [8-9]: "*"
              ├─ EmphasisMark [17-18]: "*""
    `);
  });

  it('应该增量解析代码块', () => {
    const river = new MarkdownRiver();

    const result1 = river.write('```');
    expect(treeToString(result1.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-3]: "\`\`\`"
        ├─ FencedCode [0-3]: "\`\`\`"
          ├─ CodeMark [0-3]: "\`\`\`""
    `);

    const result2 = river.write('\n');
    expect(treeToString(result2.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-4]: "\`\`\`\\n"
        ├─ FencedCode [0-4]: "\`\`\`\\n"
          ├─ CodeMark [0-3]: "\`\`\`""
    `);

    const result3 = river.write('const x = 1;\n');
    expect(treeToString(result3.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-17]: "\`\`\`\\nconst x = 1;\\n"
        ├─ FencedCode [0-17]: "\`\`\`\\nconst x = 1;\\n"
          ├─ CodeMark [0-3]: "\`\`\`"
            ├─ CodeText [4-17]: "const x = 1;\\n""
    `);

    const result4 = river.write('```');
    expect(treeToString(result4.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-20]: "\`\`\`\\nconst x = 1;\\n\`\`\`"
        ├─ FencedCode [0-20]: "\`\`\`\\nconst x = 1;\\n\`\`\`"
          ├─ CodeMark [0-3]: "\`\`\`"
            ├─ CodeText [4-16]: "const x = 1;"
              ├─ CodeMark [17-20]: "\`\`\`""
    `);
  });

  it('应该增量解析列表', () => {
    const river = new MarkdownRiver();

    const result1 = river.write('- ');
    expect(treeToString(result1.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-2]: "- "
        ├─ BulletList [0-2]: "- "
          ├─ ListItem [0-2]: "- "
            ├─ ListMark [0-1]: "-"
              ├─ Paragraph [2-2]: """
    `);

    const result2 = river.write('First item');
    expect(treeToString(result2.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-12]: "- First item"
        ├─ BulletList [0-12]: "- First item"
          ├─ ListItem [0-12]: "- First item"
            ├─ ListMark [0-1]: "-"
              ├─ Paragraph [2-12]: "First item""
    `);

    const result3 = river.write('\n- Second item');
    expect(treeToString(result3.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-26]: "- First item\\n- Secon..."
        ├─ BulletList [0-26]: "- First item\\n- Secon..."
          ├─ ListItem [0-12]: "- First item"
            ├─ ListMark [0-1]: "-"
              ├─ Paragraph [2-12]: "First item"
                ├─ ListItem [13-26]: "- Second item"
                  ├─ ListMark [13-14]: "-"
                    ├─ Paragraph [15-26]: "Second item""
    `);
  });

  it('应该处理复杂的嵌套结构', () => {
    const river = new MarkdownRiver();

    river.write('# Title\n\n');
    river.write('This is a **bold text with *nested italic* inside**.\n\n');
    river.write('- List item 1\n');
    river.write('- List item 2 with `code`\n');

    const result = river.write('');
    expect(treeToString(result.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-103]: "# Title\\n\\nThis is a *..."
        ├─ ATXHeading1 [0-7]: "# Title"
          ├─ HeaderMark [0-1]: "#"
            ├─ Paragraph [9-61]: "This is a **bold tex..."
              ├─ StrongEmphasis [19-60]: "**bold text with *ne..."
                ├─ EmphasisMark [19-21]: "**"
                  ├─ Emphasis [36-51]: "*nested italic*"
                    ├─ EmphasisMark [36-37]: "*"
                      ├─ EmphasisMark [50-51]: "*"
                        ├─ EmphasisMark [58-60]: "**"
                          ├─ BulletList [63-102]: "- List item 1\\n- List..."
                            ├─ ListItem [63-76]: "- List item 1"
                              ├─ ListMark [63-64]: "-"
                                ├─ Paragraph [65-76]: "List item 1"
                                  ├─ ListItem [77-102]: "- List item 2 with \`..."
                                    ├─ ListMark [77-78]: "-"
                                      ├─ Paragraph [79-102]: "List item 2 with \`co..."
                                        ├─ InlineCode [96-102]: "\`code\`"
                                          ├─ CodeMark [96-97]: "\`"
                                            ├─ CodeMark [101-102]: "\`""
    `);
  });

  it('应该正确处理重置', () => {
    const river = new MarkdownRiver();

    river.write('Some text');
    river.reset();

    const result = river.write('New text');
    expect(river.getText()).toBe('New text');
    expect(treeToString(result.tree, river.getText())).toMatchInlineSnapshot(`
      "├─ Document [0-8]: "New text"
        ├─ Paragraph [0-8]: "New text""
    `);
  });
});
