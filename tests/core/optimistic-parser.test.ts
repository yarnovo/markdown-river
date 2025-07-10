/**
 * 乐观解析器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OptimisticParser } from '../../src/core/optimistic-parser.js';
import { EventBus } from '../../src/infrastructure/event-bus.js';

describe('乐观解析器', () => {
  let parser: OptimisticParser;
  let eventBus: EventBus;
  let tokens: unknown[];

  beforeEach(() => {
    eventBus = new EventBus();
    parser = new OptimisticParser({ eventBus });
    tokens = [];

    // 监听 parser:token 事件
    eventBus.on('parser:token', (event: unknown) => {
      tokens.push((event as { token: unknown }).token);
    });
  });

  describe('基本功能', () => {
    it('应该处理普通文本', () => {
      parser.processChar('h');
      parser.processChar('e');
      parser.processChar('l');
      parser.processChar('l');
      parser.processChar('o');

      expect(tokens).toEqual([
        { type: 'TEXT', content: 'h' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'o' },
      ]);
    });

    it('应该处理换行', () => {
      parser.processChar('h');
      parser.processChar('i');
      parser.processChar('\n');

      expect(tokens).toEqual([
        { type: 'TEXT', content: 'h' },
        { type: 'TEXT', content: 'i' },
        { type: 'LINE_BREAK' },
      ]);
    });
  });

  describe('加粗格式', () => {
    it('应该正确处理加粗文本 **bold**', () => {
      // 输入 **bold**
      parser.processChar('*');
      parser.processChar('*');
      parser.processChar('b');
      parser.processChar('o');
      parser.processChar('l');
      parser.processChar('d');
      parser.processChar('*');
      parser.processChar('*');

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'CORRECTION_TO_BOLD_START' },
        { type: 'TEXT', content: 'b' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'd' },
        { type: 'BOLD_END', index: 1 },
        { type: 'BOLD_END', index: 2 },
      ]);
    });

    it('应该处理预期违背：*后跟空格', () => {
      parser.processChar('*');
      parser.processChar(' ');
      parser.processChar('t');
      parser.processChar('e');
      parser.processChar('x');
      parser.processChar('t');

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'CORRECTION_TO_TEXT_SPACE' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'x' },
        { type: 'TEXT', content: 't' },
      ]);
    });

    it('应该处理预期违背：*后跟换行', () => {
      parser.processChar('*');
      parser.processChar('\n');
      parser.processChar('t');
      parser.processChar('e');
      parser.processChar('x');
      parser.processChar('t');

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'CORRECTION_TO_LINE_BREAK' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'x' },
        { type: 'TEXT', content: 't' },
      ]);
    });
  });

  describe('斜体格式', () => {
    it('应该正确处理斜体文本 *italic*', () => {
      // 输入 *italic*
      parser.processChar('*');
      parser.processChar('i');
      parser.processChar('t');
      parser.processChar('a');
      parser.processChar('l');
      parser.processChar('i');
      parser.processChar('c');
      parser.processChar('*');

      // 斜体结束需要后续字符确认（支持嵌套如 *italic with **bold** inside*）
      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
      ]);

      // 调用 end() 完成解析 - 乐观完成斜体格式
      parser.end();
      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
        { type: 'TEXT', content: '*' },
        { type: 'ITALIC_END', correction: true },
      ]);
    });

    it('应该正确处理下划线斜体 _italic_', () => {
      // 输入 _italic_
      parser.processChar('_');
      parser.processChar('i');
      parser.processChar('t');
      parser.processChar('a');
      parser.processChar('l');
      parser.processChar('i');
      parser.processChar('c');
      parser.processChar('_');

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
        { type: 'ITALIC_END' },
      ]);
    });

    it('应该正确处理斜体后跟空格 *italic* ', () => {
      parser.processChar('*');
      parser.processChar('i');
      parser.processChar('t');
      parser.processChar('a');
      parser.processChar('l');
      parser.processChar('i');
      parser.processChar('c');
      parser.processChar('*');
      parser.processChar(' ');

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
        { type: 'ITALIC_END' },
        { type: 'TEXT', content: ' ' },
      ]);
    });
  });

  describe('代码格式', () => {
    it('应该正确处理行内代码 `code`', () => {
      // 输入 `code`
      parser.processChar('`');
      parser.processChar('c');
      parser.processChar('o');
      parser.processChar('d');
      parser.processChar('e');
      parser.processChar('`');

      expect(tokens).toEqual([
        { type: 'CODE_START' },
        { type: 'TEXT', content: 'c' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'd' },
        { type: 'TEXT', content: 'e' },
        { type: 'CODE_END' },
      ]);
    });
  });

  describe('预期管理机制', () => {
    it('应该在 EXPECT_BOLD_SECOND 状态正确预测加粗', () => {
      // 输入第一个 *，乐观预测为斜体
      parser.processChar('*');
      expect(tokens).toEqual([{ type: 'ITALIC_START' }]);

      // 输入第二个 *，修正为加粗（一对一原则）
      parser.processChar('*');
      expect(tokens).toEqual([{ type: 'ITALIC_START' }, { type: 'CORRECTION_TO_BOLD_START' }]);
    });

    it('应该在 EXPECT_BOLD_SECOND 状态正确确认斜体', () => {
      // 输入第一个 *，乐观预测为斜体
      parser.processChar('*');
      expect(tokens).toEqual([{ type: 'ITALIC_START' }]);

      // 输入非 * 字符，确认斜体预测正确
      parser.processChar('i');
      expect(tokens).toEqual([{ type: 'ITALIC_START' }, { type: 'TEXT', content: 'i' }]);
    });

    it('应该处理斜体后确认结束：*hello world* 然后空格', () => {
      // 输入 *hello world* 然后空格
      parser.processChar('*');
      parser.processChar('h');
      parser.processChar('e');
      parser.processChar('l');
      parser.processChar('l');
      parser.processChar('o');
      parser.processChar(' ');
      parser.processChar('w');
      parser.processChar('o');
      parser.processChar('r');
      parser.processChar('l');
      parser.processChar('d');
      parser.processChar('*');
      parser.processChar(' '); // 确认字符

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'h' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: ' ' },
        { type: 'TEXT', content: 'w' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'r' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'd' },
        { type: 'ITALIC_END' },
        { type: 'TEXT', content: ' ' },
      ]);
    });
  });

  describe('嵌套格式', () => {
    it('应该处理加粗中的下划线斜体', () => {
      // 输入 **bold _italic_ text**
      parser.processChar('*');
      parser.processChar('*');
      parser.processChar('b');
      parser.processChar('o');
      parser.processChar('l');
      parser.processChar('d');
      parser.processChar(' ');
      parser.processChar('_');
      parser.processChar('i');
      parser.processChar('t');
      parser.processChar('a');
      parser.processChar('l');
      parser.processChar('i');
      parser.processChar('c');
      parser.processChar('_');
      parser.processChar(' ');
      parser.processChar('t');
      parser.processChar('e');
      parser.processChar('x');
      parser.processChar('t');
      parser.processChar('*');
      parser.processChar('*');

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'CORRECTION_TO_BOLD_START' },
        { type: 'TEXT', content: 'b' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'd' },
        { type: 'TEXT', content: ' ' },
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
        { type: 'ITALIC_END' },
        { type: 'TEXT', content: ' ' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'x' },
        { type: 'TEXT', content: 't' },
        { type: 'BOLD_END', index: 1 },
        { type: 'BOLD_END', index: 2 },
      ]);
    });
  });

  describe('边界情况', () => {
    it('应该处理单个星号', () => {
      parser.processChar('*');
      parser.processChar(' ');

      expect(tokens).toEqual([{ type: 'ITALIC_START' }, { type: 'CORRECTION_TO_TEXT_SPACE' }]);
    });

    it('应该处理未闭合的加粗', () => {
      parser.processChar('*');
      parser.processChar('*');
      parser.processChar('b');
      parser.processChar('o');
      parser.processChar('l');
      parser.processChar('d');
      parser.end();

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'CORRECTION_TO_BOLD_START' },
        { type: 'TEXT', content: 'b' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'd' },
        { type: 'BOLD_END', correction: true },
      ]);
    });

    it('应该处理未闭合的斜体', () => {
      parser.processChar('*');
      parser.processChar('i');
      parser.processChar('t');
      parser.processChar('a');
      parser.processChar('l');
      parser.processChar('i');
      parser.processChar('c');
      parser.end();

      expect(tokens).toEqual([
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
        { type: 'ITALIC_END', correction: true },
      ]);
    });

    it('应该处理未闭合的代码', () => {
      parser.processChar('`');
      parser.processChar('c');
      parser.processChar('o');
      parser.processChar('d');
      parser.processChar('e');
      parser.end();

      expect(tokens).toEqual([
        { type: 'CODE_START' },
        { type: 'TEXT', content: 'c' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'd' },
        { type: 'TEXT', content: 'e' },
        { type: 'CODE_END', correction: true },
      ]);
    });

    it('应该处理空输入', () => {
      parser.end();
      expect(tokens).toEqual([]);
    });
  });

  describe('状态重置', () => {
    it('应该正确重置解析器状态', () => {
      // 先处理一些输入
      parser.processChar('*');
      parser.processChar('*');
      parser.processChar('b');
      parser.processChar('o');
      parser.processChar('l');
      parser.processChar('d');

      // 重置
      parser.reset();
      tokens = []; // 清空令牌数组

      // 重新处理
      parser.processChar('h');
      parser.processChar('e');
      parser.processChar('l');
      parser.processChar('l');
      parser.processChar('o');

      expect(tokens).toEqual([
        { type: 'TEXT', content: 'h' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'o' },
      ]);
    });
  });

  describe('事件发送', () => {
    it('应该发送 parser:end 事件', () => {
      let endEventReceived = false;
      eventBus.on('parser:end', () => {
        endEventReceived = true;
      });

      parser.processChar('h');
      parser.processChar('i');
      parser.end();

      expect(endEventReceived).toBe(true);
    });

    it('应该在令牌事件中包含位置信息', () => {
      const tokenEvents: unknown[] = [];
      eventBus.on('parser:token', (event: unknown) => {
        tokenEvents.push(event);
      });

      parser.processChar('h');
      parser.processChar('i');

      expect(tokenEvents).toHaveLength(2);
      expect(tokenEvents[0]).toHaveProperty('position', 1);
      expect(tokenEvents[0]).toHaveProperty('timestamp');
      expect(tokenEvents[1]).toHaveProperty('position', 2);
      expect(tokenEvents[1]).toHaveProperty('timestamp');
    });
  });

  describe('复杂场景', () => {
    it('应该处理混合格式文本', () => {
      // 输入 "Hello **bold** and *italic* text"
      const input = 'Hello **bold** and *italic* text';
      for (const char of input) {
        parser.processChar(char);
      }

      expect(tokens).toEqual([
        { type: 'TEXT', content: 'H' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: ' ' },
        { type: 'ITALIC_START' },
        { type: 'CORRECTION_TO_BOLD_START' },
        { type: 'TEXT', content: 'b' },
        { type: 'TEXT', content: 'o' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'd' },
        { type: 'BOLD_END', index: 1 },
        { type: 'BOLD_END', index: 2 },
        { type: 'TEXT', content: ' ' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'n' },
        { type: 'TEXT', content: 'd' },
        { type: 'TEXT', content: ' ' },
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'a' },
        { type: 'TEXT', content: 'l' },
        { type: 'TEXT', content: 'i' },
        { type: 'TEXT', content: 'c' },
        { type: 'ITALIC_END' },
        { type: 'TEXT', content: ' ' },
        { type: 'TEXT', content: 't' },
        { type: 'TEXT', content: 'e' },
        { type: 'TEXT', content: 'x' },
        { type: 'TEXT', content: 't' },
      ]);
    });
  });
});
