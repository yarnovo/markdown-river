import { describe, it, expect } from 'vitest';
import { ParseStrategy } from '../../../src/strategies/ParseStrategy';

// 创建一个自定义策略来演示返回字符串的能力
class CustomContentStrategy implements ParseStrategy {
  process(content: string, lastParsedIndex: number): number | string {
    const unparsed = content.slice(lastParsedIndex);

    // 如果包含特殊标记，返回处理后的内容
    if (unparsed.includes(':::warning')) {
      // 直接返回处理好的内容，避免闪烁
      const beforeContent = content.slice(0, lastParsedIndex);
      const warningText = unparsed.replace(':::warning', '').trim();
      return beforeContent + '> ⚠️ **警告**: ' + warningText;
    }

    // 如果包含未完成的特殊标记，保持当前位置
    if (unparsed.includes(':::')) {
      return lastParsedIndex;
    }

    // 否则返回安全解析位置
    return content.length;
  }
}

describe('CustomContentStrategy', () => {
  const strategy = new CustomContentStrategy();

  describe('返回字符串功能', () => {
    it('应该能够返回处理后的内容而不是位置', () => {
      const content = 'Hello\n:::warning 这是一个警告消息';
      const result = strategy.process(content, 6); // "Hello\n" 之后

      expect(typeof result).toBe('string');
      expect(result).toBe('Hello\n> ⚠️ **警告**: 这是一个警告消息');
    });

    it('正常情况下仍然返回数字位置', () => {
      const content = 'Hello world';
      const result = strategy.process(content, 0);

      expect(typeof result).toBe('number');
      expect(result).toBe(11);
    });

    it('有歧义但没有特殊标记时返回当前位置', () => {
      const content = 'Hello ::: incomplete';
      const result = strategy.process(content, 6);

      expect(typeof result).toBe('number');
      expect(result).toBe(6);
    });
  });

  describe('与 MarkdownRiver 集成', () => {
    it('应该能够正确处理策略返回的字符串', async () => {
      const { MarkdownRiver } = await import('../../../src/core/MarkdownRiver');
      const river = new MarkdownRiver({ strategy: new CustomContentStrategy() });

      let parsedContent = '';
      river.on('content:parsed', ({ content }) => {
        parsedContent = content;
      });

      river.write('Hello\n');
      river.write(':::warning 注意安全');

      // 策略应该返回处理后的内容
      expect(parsedContent).toContain('⚠️ **警告**');
    });
  });
});
