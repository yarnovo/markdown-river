import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownTransformer } from '../../../src/core/MarkdownTransformer';

describe('MarkdownTransformer', () => {
  let transformer: MarkdownTransformer;

  beforeEach(() => {
    transformer = new MarkdownTransformer();
  });

  describe('行内代码转换', () => {
    it('应该过滤单独的反引号', () => {
      expect(transformer.transform('Hello `')).toBe('Hello ');
    });

    it('应该补全未闭合的行内代码', () => {
      expect(transformer.transform('Hello `code')).toBe('Hello `code`');
    });

    it('不应该修改已闭合的行内代码', () => {
      expect(transformer.transform('Hello `code` world')).toBe('Hello `code` world');
    });
  });

  describe('斜体转换', () => {
    it('应该过滤单独的星号', () => {
      expect(transformer.transform('Hello *')).toBe('Hello ');
    });

    it('应该补全未闭合的斜体', () => {
      expect(transformer.transform('Hello *world')).toBe('Hello *world*');
    });

    it('不应该修改已闭合的斜体', () => {
      expect(transformer.transform('Hello *world* test')).toBe('Hello *world* test');
    });
  });

  describe('加粗转换', () => {
    it('应该过滤单独的双星号', () => {
      expect(transformer.transform('Hello **')).toBe('Hello ');
    });

    it('应该补全未闭合的加粗', () => {
      expect(transformer.transform('Hello **bold')).toBe('Hello **bold**');
    });

    it('不应该修改已闭合的加粗', () => {
      expect(transformer.transform('Hello **bold** text')).toBe('Hello **bold** text');
    });
  });

  describe('链接转换', () => {
    it('应该过滤单独的方括号', () => {
      expect(transformer.transform('Hello [')).toBe('Hello ');
    });

    it('应该补全未闭合的链接', () => {
      expect(transformer.transform('Hello [link')).toBe('Hello [link]()');
    });

    it('不应该修改已闭合的链接', () => {
      expect(transformer.transform('Hello [link](url) test')).toBe('Hello [link](url) test');
    });
  });

  describe('下划线格式转换', () => {
    it('应该过滤单独的下划线', () => {
      expect(transformer.transform('Hello _')).toBe('Hello ');
    });

    it('应该补全未闭合的下划线斜体', () => {
      expect(transformer.transform('Hello _italic')).toBe('Hello _italic_');
    });

    it('应该过滤单独的双下划线', () => {
      expect(transformer.transform('Hello __')).toBe('Hello ');
    });

    it('应该补全未闭合的下划线加粗', () => {
      expect(transformer.transform('Hello __bold')).toBe('Hello __bold__');
    });
  });

  describe('混合场景', () => {
    it('应该处理多个未闭合的格式', () => {
      expect(transformer.transform('Hello *world and `code')).toBe('Hello *world and `code`*');
    });

    it('应该正确处理混合的已闭合和未闭合格式', () => {
      expect(transformer.transform('Hello *world* and `code')).toBe('Hello *world* and `code`');
    });
  });
});
