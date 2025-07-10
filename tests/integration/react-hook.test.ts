import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMarkdownRiver } from '../../src/react/useMarkdownRiver';

describe('useMarkdownRiver Hook Integration', () => {
  it('should initialize with empty content', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    expect(result.current.content).toBeNull();
    expect(result.current.rawHtml).toBe('');
    expect(typeof result.current.write).toBe('function');
    expect(typeof result.current.end).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should process markdown content through write method', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# Hello World');
    });

    expect(result.current.rawHtml).toContain('Hello World');
    expect(result.current.rawHtml).toContain('<h1>');
  });

  it('should handle streaming markdown content', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# ');
      result.current.write('Hello ');
      result.current.write('World');
    });

    expect(result.current.rawHtml).toContain('Hello World');
    expect(result.current.rawHtml).toContain('<h1>');
  });

  it('should handle emphasis formatting', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('**bold** and *italic*');
    });

    expect(result.current.rawHtml).toContain('<strong>bold</strong>');
    expect(result.current.rawHtml).toContain('<em>italic</em>');
  });

  it('should handle code blocks', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('```javascript\nconst x = 1;\n```');
    });

    expect(result.current.rawHtml).toContain('<pre>');
    expect(result.current.rawHtml).toContain('<code');
    expect(result.current.rawHtml).toContain('const x = 1;');
  });

  it('should handle inline code', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('Use `console.log()` for debugging');
    });

    expect(result.current.rawHtml).toContain('<code>console.log()</code>');
  });

  it('should handle lists', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('- Item 1\n- Item 2');
    });

    expect(result.current.rawHtml).toContain('<ul>');
    expect(result.current.rawHtml).toContain('<li>Item 1</li>');
    expect(result.current.rawHtml).toContain('<li>Item 2</li>');
  });

  it('should handle links', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('[GitHub](https://github.com)');
    });

    expect(result.current.rawHtml).toContain('<a href="https://github.com">GitHub</a>');
  });

  it('should reset content when reset is called', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# Hello World');
    });

    expect(result.current.rawHtml).toContain('Hello World');

    act(() => {
      result.current.reset();
    });

    expect(result.current.rawHtml).toBe('');
    expect(result.current.content).toBeNull();
  });

  it('should handle end method', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# Hello');
      result.current.end();
    });

    expect(result.current.rawHtml).toContain('<h1>Hello</h1>');
  });

  it('should work with custom marked options', () => {
    const { result } = renderHook(() =>
      useMarkdownRiver({
        markedOptions: {
          breaks: true,
          gfm: true,
        },
      })
    );

    act(() => {
      result.current.write('Line 1\nLine 2');
    });

    // With breaks: true, single line breaks should create <br> tags
    expect(result.current.rawHtml).toContain('<br>');
  });

  it('should handle optimistic updates for incomplete formatting', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('*hello');
    });

    // Should have some content (optimistic update)
    expect(result.current.rawHtml.length).toBeGreaterThan(0);
  });

  it('should return React elements in content property', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# Hello World');
    });

    expect(result.current.content).not.toBeNull();
    // Content should be a React element or fragment
    expect(typeof result.current.content).toBe('object');
  });

  it('should handle multiple resets without errors', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# Test');
      result.current.reset();
      result.current.reset(); // Second reset
      result.current.write('# New Content');
    });

    expect(result.current.rawHtml).toContain('New Content');
    expect(result.current.rawHtml).not.toContain('Test');
  });

  it('should handle complex nested markdown', () => {
    const { result } = renderHook(() => useMarkdownRiver());

    act(() => {
      result.current.write('# Title\n\n- **Bold item**\n- *Italic item*\n\n`code` here');
    });

    expect(result.current.rawHtml).toContain('<h1>Title</h1>');
    expect(result.current.rawHtml).toContain('<ul>');
    expect(result.current.rawHtml).toContain('<strong>Bold item</strong>');
    expect(result.current.rawHtml).toContain('<em>Italic item</em>');
    expect(result.current.rawHtml).toContain('<code>code</code>');
  });
});
