import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { MarkdownParser } from '../../../src/core/MarkdownParser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeAll(() => {
    // Mock document for Node.js environment
    (global as { document?: unknown }).document = {
      createElement: vi.fn(() => ({
        textContent: '',
        innerHTML: '',
      })),
    };
  });

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  describe('parse', () => {
    it('should parse simple text', () => {
      const result = parser.parse('Hello World');
      expect(result).toContain('Hello World');
    });

    it('should parse bold text', () => {
      const result = parser.parse('**bold**');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should parse italic text', () => {
      const result = parser.parse('*italic*');
      expect(result).toContain('<em>italic</em>');
    });

    it('should parse inline code', () => {
      const result = parser.parse('`code`');
      expect(result).toContain('<code>code</code>');
    });

    it('should parse headings', () => {
      const result = parser.parse('# Heading 1\n## Heading 2');
      expect(result).toContain('<h1');
      expect(result).toContain('Heading 1');
      expect(result).toContain('<h2');
      expect(result).toContain('Heading 2');
    });

    it('should parse lists', () => {
      const result = parser.parse('- Item 1\n- Item 2');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('should parse code blocks', () => {
      const result = parser.parse('```js\nconst x = 1;\n```');
      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
      expect(result).toContain('const x = 1;');
    });

    it('should handle GFM features', () => {
      const result = parser.parse('~~strikethrough~~');
      expect(result).toContain('<del>strikethrough</del>');
    });
  });

  describe('configure', () => {
    it('should accept custom options', () => {
      parser.configure({ breaks: false });
      const result = parser.parse('Line 1\nLine 2');
      // Without breaks, newline should not create <br>
      expect(result).not.toContain('<br>');
    });
  });

  describe('error handling', () => {
    it('should handle parsing errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a new parser instance for this test
      const errorParser = new MarkdownParser();

      // Mock the escapeHtml method to work in test environment
      (errorParser as unknown as { escapeHtml: (text: string) => string }).escapeHtml = (
        text: string
      ) => text;

      // Mock the markedInstance to throw an error
      const errorInstance = {
        parse: vi.fn().mockImplementation(() => {
          throw new Error('Mocked parsing error');
        }),
      };
      (errorParser as unknown as { markedInstance: unknown }).markedInstance = errorInstance;

      // This should trigger error handling
      const result = errorParser.parse('some content');

      // The result should be wrapped in pre tag
      expect(result).toBe('<pre>some content</pre>');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Markdown parsing error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
