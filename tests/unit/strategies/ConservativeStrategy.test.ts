import { describe, it, expect } from 'vitest';
import { ConservativeStrategy } from '../../../src/strategies/ConservativeStrategy';

describe('ConservativeStrategy', () => {
  const strategy = new ConservativeStrategy();

  describe('hasAmbiguity', () => {
    it('should detect any format marker as ambiguous', () => {
      expect(strategy.hasAmbiguity('Hello *', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello _', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello `', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello [', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello #', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello >', 0)).toBe(true);
      expect(strategy.hasAmbiguity('Hello -', 0)).toBe(true);
    });

    it('should not detect ambiguity in plain text', () => {
      expect(strategy.hasAmbiguity('Hello World', 0)).toBe(false);
      expect(strategy.hasAmbiguity('Hello World.', 0)).toBe(false);
    });

    it('should only check unparsed content', () => {
      const content = 'Hello *world*. Plain text';
      expect(strategy.hasAmbiguity(content, 14)).toBe(false); // " Plain text" has no markers

      const content2 = 'Hello world. New *';
      expect(strategy.hasAmbiguity(content2, 12)).toBe(true); // " New *" has marker
    });
  });

  describe('getSafeParseIndex', () => {
    it('should not parse when there is ambiguity', () => {
      const content = 'Hello\nWorld *italic';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(0); // Don't parse until ambiguity resolved
    });

    it('should not parse with format markers', () => {
      const content = 'Hello World *italic';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(0); // Don't parse until ambiguity resolved
    });

    it('should parse everything if no ambiguity', () => {
      const content = 'Hello World';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(11);
    });

    it('should not advance if no safe boundary found', () => {
      const content = 'Hello*world';
      expect(strategy.getSafeParseIndex(content, 0)).toBe(0); // No safe boundary
    });

    it('should handle content with only parsed portion', () => {
      const content = 'Already parsed content';
      expect(strategy.getSafeParseIndex(content, content.length)).toBe(content.length);
    });
  });
});
