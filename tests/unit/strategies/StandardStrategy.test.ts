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

    it('should detect unclosed code block', () => {
      expect(strategy.hasAmbiguity('```', 0)).toBe(true);
      expect(strategy.hasAmbiguity('```js', 0)).toBe(true);
      expect(strategy.hasAmbiguity('```js\ncode\n```', 0)).toBe(false);
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
