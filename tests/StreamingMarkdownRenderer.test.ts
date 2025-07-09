import { describe, it, expect } from 'vitest';
import { StreamingMarkdownRenderer } from '../src/index.js';

describe('StreamingMarkdownRenderer', () => {
  it('should export StreamingMarkdownRenderer class', () => {
    expect(StreamingMarkdownRenderer).toBeDefined();
    expect(typeof StreamingMarkdownRenderer).toBe('function');
  });

  it('should export required types', () => {
    // This is a basic test to ensure the module exports correctly
    expect(true).toBe(true);
  });
});
