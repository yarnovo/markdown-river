import { describe, it, expect, vi } from 'vitest';
import { MarkdownRiver } from '../../src';

describe('Streaming Integration Tests', () => {
  describe('real-world streaming scenarios', () => {
    it('should handle character-by-character streaming of formatted text', async () => {
      const river = new MarkdownRiver();
      const results: string[] = [];

      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      // Simulate character-by-character streaming
      const text = '**Hello** *world*';
      for (const char of text) {
        river.write(char);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      river.end();

      // Should have buffered until format markers were complete
      expect(results.length).toBeGreaterThan(0);
      const finalHtml = results[results.length - 1];
      expect(finalHtml).toContain('<strong>Hello</strong>');
      expect(finalHtml).toContain('<em>world</em>');
    });

    it('should handle chunked streaming with mixed content', async () => {
      const river = new MarkdownRiver();
      const chunks = [
        '# Title\n',
        'This is **bold',
        ' text** and ',
        '*italic text*.\n',
        '- List item 1\n',
        '- List item 2\n',
        '```js\n',
        'const x = 1;\n',
        '```',
      ];

      const results: string[] = [];
      river.on('content:parsed', ({ html }) => {
        results.push(html);
      });

      for (const chunk of chunks) {
        river.write(chunk);
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      river.end();

      const finalHtml = results[results.length - 1];
      expect(finalHtml).toContain('<h1');
      expect(finalHtml).toContain('Title');
      expect(finalHtml).toContain('<strong>bold text</strong>');
      expect(finalHtml).toContain('<em>italic text</em>');
      expect(finalHtml).toContain('<ul>');
      expect(finalHtml).toContain('<pre>');
      expect(finalHtml).toContain('const x = 1;');
    });

    it('should handle streaming with incomplete markers at end', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('Hello **world');

      // Should not parse yet
      expect(handler).not.toHaveBeenCalled();

      river.end();

      // Should parse on end despite incomplete marker
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello **world',
        })
      );
    });

    it('should handle complex nested formatting', () => {
      const river = new MarkdownRiver();
      const results: { html: string; content: string }[] = [];

      river.on('content:parsed', data => {
        results.push(data);
      });

      // Complex nested case
      river.write('**Bold with *nested italic* inside**');
      river.end();

      expect(results.length).toBeGreaterThan(0);
      const finalHtml = results[results.length - 1].html;
      expect(finalHtml).toContain('<strong>');
      expect(finalHtml).toContain('<em>');
      expect(finalHtml).toContain('nested italic');
    });

    it('should handle multiple paragraphs with formatting', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('First paragraph with **bold**.\n\n');
      river.write('Second paragraph with *italic*.\n\n');
      river.write('Third paragraph with `code`.');
      river.end();

      expect(handler).toHaveBeenCalled();
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0];

      expect(lastCall.html).toContain('<strong>bold</strong>');
      expect(lastCall.html).toContain('<em>italic</em>');
      expect(lastCall.html).toContain('<code>code</code>');
      expect(lastCall.html).toContain('<p>');
    });
  });

  describe('performance scenarios', () => {
    it('should handle large content efficiently', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      // Generate large content
      const largeContent = Array(1000).fill('Line of text\n').join('');
      river.write(largeContent);
      river.end();

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[handler.mock.calls.length - 1][0].content).toBe(largeContent);
    });

    it('should handle rapid small chunks', async () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      // Rapid fire small chunks
      for (let i = 0; i < 100; i++) {
        river.write(`Word${i} `);
      }
      river.end();

      expect(handler).toHaveBeenCalled();
      const finalContent = handler.mock.calls.map(call => call[0].content).join('');

      expect(finalContent).toContain('Word0');
      expect(finalContent).toContain('Word99');
    });
  });

  describe('edge cases', () => {
    it('should handle empty writes', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('');
      river.write('Hello');
      river.write('');
      river.end();

      expect(handler).toHaveBeenCalled();
    });

    it('should handle only format markers', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('****');
      river.end();

      expect(handler).toHaveBeenCalled();
      // Empty bold/italic
      expect(handler.mock.calls[0][0].html).toBeDefined();
    });

    it('should handle deeply nested formats', () => {
      const river = new MarkdownRiver();
      const handler = vi.fn();
      river.on('content:parsed', handler);

      river.write('***__nested `code` text__***');
      river.end();

      expect(handler).toHaveBeenCalled();
      const html = handler.mock.calls[0][0].html;
      expect(html).toContain('<code>code</code>');
    });
  });
});
