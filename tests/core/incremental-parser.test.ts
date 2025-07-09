import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncrementalParser } from '../../src/core/incremental-parser';
import { EventBus } from '../../src/infrastructure/event-bus';
import { BufferManager } from '../../src/core/buffer-manager';
import { TokenType, Token, ContextType } from '../../src/types/parser-events';

describe('IncrementalParser', () => {
  let parser: IncrementalParser;
  let eventBus: EventBus;
  let bufferManager: BufferManager;

  beforeEach(() => {
    eventBus = new EventBus();
    bufferManager = new BufferManager({ bufferSize: 1024 });
    parser = new IncrementalParser({ eventBus, bufferManager });
  });

  describe('基础解析', () => {
    it('应该解析纯文本', () => {
      const tokens = parser.parse('Hello World');

      // 应该开始段落
      expect(tokens[0].type).toBe(TokenType.PARAGRAPH_START);

      // 检查文本内容
      const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
      const text = textTokens.map(t => t.content).join('');
      expect(text).toBe('HelloWorld');

      // 检查空格
      const spaceTokens = tokens.filter(t => t.type === TokenType.WHITESPACE);
      expect(spaceTokens).toHaveLength(1);
    });

    it('应该识别换行符', () => {
      const tokens = parser.parse('Line1\nLine2');

      const newlineTokens = tokens.filter(t => t.type === TokenType.NEWLINE);
      expect(newlineTokens).toHaveLength(1);
    });

    it('应该识别段落边界', () => {
      const tokens = parser.parse('Paragraph1\n\nParagraph2');

      const paragraphStarts = tokens.filter(t => t.type === TokenType.PARAGRAPH_START);
      const paragraphEnds = tokens.filter(t => t.type === TokenType.PARAGRAPH_END);

      expect(paragraphStarts.length).toBeGreaterThan(0);
      expect(paragraphEnds.length).toBeGreaterThan(0);
    });
  });

  describe('强调语法', () => {
    it('应该识别可能的斜体标记', () => {
      const tokens = parser.parse('*italic*');

      const potentialTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_EMPHASIS);
      expect(potentialTokens.length).toBeGreaterThan(0);
    });

    it('应该识别可能的加粗标记', () => {
      const tokens = parser.parse('**bold**');

      const potentialTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_STRONG);
      expect(potentialTokens.length).toBeGreaterThan(0);
    });

    it('应该处理下划线强调', () => {
      const tokens = parser.parse('_italic_ and __bold__');

      const emphasisTokens = tokens.filter(
        t => t.type === TokenType.POTENTIAL_EMPHASIS || t.type === TokenType.POTENTIAL_STRONG
      );
      expect(emphasisTokens.length).toBeGreaterThan(0);
    });

    it('应该处理嵌套强调', () => {
      const tokens = parser.parse('**bold with *italic* inside**');

      // 应该包含强调相关令牌
      const hasStrong = tokens.some(t => t.type === TokenType.POTENTIAL_STRONG);
      const hasEmphasis = tokens.some(t => t.type === TokenType.POTENTIAL_EMPHASIS);

      expect(hasStrong).toBe(true);
      expect(hasEmphasis).toBe(true);
    });
  });

  describe('代码语法', () => {
    it('应该识别行内代码', () => {
      const tokens = parser.parse('`code`');

      const codeTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_CODE);
      expect(codeTokens.length).toBeGreaterThan(0);
    });

    it('应该识别代码块', () => {
      const tokens = parser.parse('```\ncode block\n```');

      const codeBlockTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_CODE_BLOCK);
      expect(codeBlockTokens.length).toBeGreaterThan(0);
    });
  });

  describe('标题语法', () => {
    it('应该识别各级标题', () => {
      const headings = ['# H1', '## H2', '### H3', '#### H4', '##### H5', '###### H6'];

      headings.forEach((heading, index) => {
        const parser = new IncrementalParser({
          eventBus,
          bufferManager: new BufferManager({ bufferSize: 1024 }),
        });
        const tokens = parser.parse(heading);
        const headingTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_HEADING);

        expect(headingTokens.length).toBeGreaterThan(0);
        if (headingTokens[0].metadata) {
          expect(headingTokens[0].metadata.level).toBe(index + 1);
        }
      });
    });

    it('应该区分标题和普通井号', () => {
      const tokens = parser.parse('#hashtag');

      // 不应该识别为标题（没有空格）
      const headingTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_HEADING);
      expect(headingTokens).toHaveLength(0);
    });
  });

  describe('链接和图片', () => {
    it('应该识别链接语法', () => {
      const tokens = parser.parse('[link text](url)');

      const linkTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_LINK_START);
      expect(linkTokens.length).toBeGreaterThan(0);
    });

    it('应该识别图片语法', () => {
      const tokens = parser.parse('![alt text](image.jpg)');

      const imageTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_IMAGE_START);
      expect(imageTokens.length).toBeGreaterThan(0);
    });
  });

  describe('列表语法', () => {
    it('应该识别无序列表', () => {
      const markers = ['- item', '* item', '+ item'];

      markers.forEach(marker => {
        const parser = new IncrementalParser({
          eventBus,
          bufferManager: new BufferManager({ bufferSize: 1024 }),
        });
        const tokens = parser.parse(marker);
        const listTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_LIST_ITEM);

        expect(listTokens.length).toBeGreaterThan(0);
        if (listTokens[0].metadata) {
          expect(listTokens[0].metadata.listType).toBe('unordered');
        }
      });
    });

    it('应该识别有序列表', () => {
      const tokens = parser.parse('1. item');

      const listTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_LIST_ITEM);
      expect(listTokens.length).toBeGreaterThan(0);
      if (listTokens[0].metadata) {
        expect(listTokens[0].metadata.listType).toBe('ordered');
      }
    });
  });

  describe('引用语法', () => {
    it('应该识别引用块', () => {
      const tokens = parser.parse('> quote');

      const quoteTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_BLOCKQUOTE);
      expect(quoteTokens.length).toBeGreaterThan(0);
    });
  });

  describe('分隔线', () => {
    it('应该识别水平分隔线', () => {
      const rules = ['---', '***', '___'];

      rules.forEach(rule => {
        const tokens = parser.parse(rule);
        const hrTokens = tokens.filter(t => t.type === TokenType.POTENTIAL_HORIZONTAL_RULE);

        expect(hrTokens.length).toBeGreaterThan(0);
      });
    });
  });

  describe('状态管理', () => {
    it('应该正确更新位置信息', () => {
      parser.parse('abc');
      const state = parser.getState();

      expect(state.position).toBe(3);
      expect(state.line).toBe(1);
      expect(state.column).toBe(4);
    });

    it('应该正确处理多行文本', () => {
      parser.parse('line1\nline2\nline3');
      const state = parser.getState();

      expect(state.line).toBe(3);
    });

    it('应该维护上下文栈', () => {
      parser.parse('**bold**');

      // 在解析过程中会压入和弹出上下文
      const state = parser.getState();
      expect(state.contextStack.length).toBeGreaterThanOrEqual(1);
      expect(state.contextStack[0].type).toBe(ContextType.ROOT);
    });
  });

  describe('事件发射', () => {
    it('应该发射令牌生成事件', () => {
      const spy = vi.fn();
      eventBus.on('token:generated', spy);

      parser.parse('Hello');

      expect(spy).toHaveBeenCalled();
      const calls = spy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // 检查事件数据
      const eventData = calls[0][0];
      expect(eventData).toHaveProperty('token');
      expect(eventData).toHaveProperty('timestamp');
    });

    it('应该在回溯时发射事件', () => {
      const spy = vi.fn();
      eventBus.on('parse:backtrack', spy);

      parser.parse('Hello');
      parser.backtrack(2);

      expect(spy).toHaveBeenCalledOnce();
      const eventData = spy.mock.calls[0][0];
      expect(eventData.fromPosition).toBe(5);
      expect(eventData.toPosition).toBe(3);
    });
  });

  describe('回溯功能', () => {
    it('应该支持回溯', () => {
      parser.parse('12345');
      const stateBefore = parser.getState();

      parser.backtrack(3);
      const stateAfter = parser.getState();

      expect(stateAfter.position).toBe(stateBefore.position - 3);
    });

    it('应该限制最大回溯距离', () => {
      parser.parse('Hello');

      expect(() => {
        parser.backtrack(200); // 超过默认最大值 100
      }).toThrow();
    });

    it('应该清空待确认令牌', () => {
      parser.parse('**');
      const stateBefore = parser.getState();
      expect(stateBefore.pendingTokens.length).toBeGreaterThan(0);

      parser.backtrack(1);
      const stateAfter = parser.getState();
      expect(stateAfter.pendingTokens).toHaveLength(0);
    });
  });

  describe('结束处理', () => {
    it('应该正确结束解析', () => {
      parser.parse('Hello');
      const endTokens = parser.end();

      // 应该包含 EOF 令牌
      const eofToken = endTokens.find(t => t.type === TokenType.EOF);
      expect(eofToken).toBeDefined();
    });

    it('应该关闭未闭合的段落', () => {
      parser.parse('Unclosed paragraph');
      const endTokens = parser.end();

      // 应该包含段落结束令牌
      const paragraphEnd = endTokens.find(t => t.type === TokenType.PARAGRAPH_END);
      expect(paragraphEnd).toBeDefined();
    });

    it('应该处理待确认令牌', () => {
      parser.parse('**unclosed bold');
      const endTokens = parser.end();

      // 待确认的令牌应该被转换为文本
      const textTokens = endTokens.filter(t => t.type === TokenType.TEXT);
      const text = textTokens.map(t => t.content).join('');
      expect(text).toContain('**');
    });
  });

  describe('重置功能', () => {
    it('应该重置所有状态', () => {
      parser.parse('Hello World');
      parser.reset();

      const state = parser.getState();
      expect(state.position).toBe(0);
      expect(state.line).toBe(1);
      expect(state.column).toBe(1);
      expect(state.pendingTokens).toHaveLength(0);
      expect(state.recentTokens).toHaveLength(0);
    });
  });

  describe('流式输入', () => {
    it('应该正确处理分块输入', () => {
      const chunks = ['**', 'bo', 'ld', '**'];
      const allTokens: Token[] = [];

      chunks.forEach(chunk => {
        const tokens = parser.parse(chunk);
        allTokens.push(...tokens);
      });

      // 应该能识别完整的加粗语法
      const strongTokens = allTokens.filter(
        t =>
          t.type === TokenType.POTENTIAL_STRONG ||
          t.type === TokenType.STRONG_START ||
          t.type === TokenType.STRONG_END
      );
      expect(strongTokens.length).toBeGreaterThan(0);
    });

    it('应该保持跨块的状态', () => {
      parser.parse('Hello ');
      const state1 = parser.getState();

      parser.parse('World');
      const state2 = parser.getState();

      expect(state2.position).toBe(state1.position + 5);
    });
  });

  describe('边界情况', () => {
    it('应该处理空输入', () => {
      const tokens = parser.parse('');
      expect(tokens).toHaveLength(0);
    });

    it('应该处理只有空白的输入', () => {
      const tokens = parser.parse('   \n\t  ');

      const whitespaceTokens = tokens.filter(
        t => t.type === TokenType.WHITESPACE || t.type === TokenType.NEWLINE
      );
      expect(whitespaceTokens.length).toBeGreaterThan(0);
    });

    it('应该处理特殊字符', () => {
      const special = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const tokens = parser.parse(special);

      // 不应该崩溃，应该作为文本处理
      const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
      expect(textTokens.length).toBeGreaterThan(0);
    });

    it('应该处理非ASCII字符', () => {
      const tokens = parser.parse('你好世界 🌍');

      // 应该正确处理Unicode字符
      const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
      const text = textTokens.map(t => t.content).join('');
      expect(text).toContain('你好世界');
      expect(text).toContain('🌍');
    });
  });

  describe('性能相关', () => {
    it('应该限制令牌历史大小', () => {
      const longText = 'a'.repeat(100);
      parser.parse(longText);

      const state = parser.getState();
      // 默认历史大小为 20
      expect(state.recentTokens.length).toBeLessThanOrEqual(20);
    });

    it('应该处理大量输入', () => {
      const largeText = 'Hello World\n'.repeat(1000);

      expect(() => {
        parser.parse(largeText);
      }).not.toThrow();
    });
  });
});
