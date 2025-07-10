import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarkdownRiver } from '../../../src/core/MarkdownRiver';

describe('MarkdownRiver', () => {
  let river: MarkdownRiver;
  let parsedHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    river = new MarkdownRiver();
    parsedHandler = vi.fn();
    river.on('content:parsed', parsedHandler);
  });

  afterEach(() => {
    river.destroy();
  });

  describe('basic functionality', () => {
    it('should parse content without format markers', () => {
      river.write('Hello World');

      expect(parsedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello World',
          html: expect.stringContaining('Hello World'),
        })
      );
    });

    it('should handle stream lifecycle events', () => {
      const startHandler = vi.fn();
      const endHandler = vi.fn();

      river.on('stream:start', startHandler);
      river.on('stream:end', endHandler);

      river.write('Hello');
      expect(startHandler).toHaveBeenCalled();

      river.end();
      expect(endHandler).toHaveBeenCalled();
    });
  });

  describe('ambiguity detection', () => {
    it('should buffer content with unclosed format marker', () => {
      river.write('Hello *');

      // Should parse up to the '*' symbol
      expect(parsedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello ',
          html: '<p>Hello </p>\n',
        })
      );

      river.write('world*');

      // Should parse the complete format
      expect(parsedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '*world*',
          html: expect.stringContaining('<em>world</em>'),
        })
      );
    });

    it('should handle nested format markers', () => {
      river.write('**Hello ');

      // Should trigger optimistic update for unclosed **
      expect(parsedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '**Hello**',
          html: '<p><strong>Hello</strong></p>\n',
        })
      );

      river.write('*world*');
      river.write('**');

      // Should have multiple calls for the streaming updates
      expect(parsedHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('end() method', () => {
    it('should force parse all remaining content', () => {
      river.write('Hello *incomplete');

      // Should trigger optimistic update immediately
      expect(parsedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello *incomplete*',
          html: '<p>Hello <em>incomplete</em></p>\n',
        })
      );

      river.end();

      // end() should be idempotent when content is already parsed
      expect(parsedHandler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple end() calls gracefully', () => {
      river.write('Hello');
      parsedHandler.mockClear();

      river.end();
      river.end();

      // Should only emit once
      expect(parsedHandler).toHaveBeenCalledTimes(0); // No unparsed content
    });
  });

  describe('error handling', () => {
    it('should not write to ended stream', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      river.end();
      river.write('Should not process');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Cannot write to ended stream');
      consoleWarnSpy.mockRestore();
    });
  });
});
