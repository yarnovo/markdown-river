import { describe, it, expect } from 'vitest';
import { StandardStrategy } from '../../../src/strategies/StandardStrategy';

describe('StandardStrategy', () => {
  const strategy = new StandardStrategy();

  describe('hasAmbiguity', () => {
    it('should detect unclosed single asterisk', () => {
      expect(strategy.hasAmbiguity('Hello *', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello *world', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello *world*', 0)).toBe(false);
    });

    it('should detect unclosed double asterisk', () => {
      expect(strategy.hasAmbiguity('Hello **', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello **bold', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello **bold**', 0)).toBe(false);
    });

    it('should detect unclosed backtick', () => {
      expect(strategy.hasAmbiguity('Hello `', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello `code', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello `code`', 0)).toBe(false);
    });

    it('should handle code blocks correctly (Marked auto-closes them)', () => {
      // 修复后：由于 Marked 库能自动处理未闭合的代码块，这些不再被视为歧义
      expect(strategy.hasAmbiguity('```', 0)).toBe(false);
      expect(strategy.hasAmbiguity('```js', 0)).toBe(false);
      expect(strategy.hasAmbiguity('```js\ncode', 0)).toBe(false);
      expect(strategy.hasAmbiguity('```js\ncode\n```', 0)).toBe(false);
    });

    it('should handle mixed content with code blocks', () => {
      // 混合内容中的代码块不应该导致歧义
      const content = 'Here is code:\n```javascript\nconst a = 1;';
      expect(strategy.hasAmbiguity(content, 0)).toBe(false);

      // 代码块后的其他内容
      const contentAfter = 'Here is code:\n```javascript\nconst a = 1;\n```\nAnd more *text';
      expect(strategy.hasAmbiguity(contentAfter, 0)).toBe(true); // 因为有未闭合的星号
    });

    it('should differentiate inline code from code blocks', () => {
      // 行内代码仍然需要检测歧义
      expect(strategy.hasAmbiguity('This is `inline', 0)).toBe(true);
      expect(strategy.hasAmbiguity('This is `inline`', 0)).toBe(false);

      // 但代码块不需要
      expect(strategy.hasAmbiguity('This is\n```\nblock', 0)).toBe(false);
    });

    it('should detect unclosed bracket', () => {
      expect(strategy.hasAmbiguity('Hello [', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello [link', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello [link]', 0)).toBe(false);
    });

    it('should only check unparsed content', () => {
      const content = 'Hello *world*. New *';
      expect(strategy.hasAmbiguity(content, 14)).toBe(true); // Only checks " New *"
      expect(strategy.hasAmbiguity(content, 13)).toBe(true); // Checks ". New *"
    });
  });

  describe('getSafeParseIndex', () => {
    it('should not parse when there is ambiguity', () => {
      const content = 'Hello *world';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(0); // Don't parse until ambiguity resolved
    });

    it('should return full length when no ambiguity', () => {
      const content = 'Hello world';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(11);
    });

    it('should handle multiple format markers', () => {
      const content = 'Hello **bold *italic';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(0); // Don't parse until ambiguity resolved
    });

    it('should parse everything when no ambiguity', () => {
      const content = 'Hello *world*';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(13); // Parse everything
    });
  });
});
