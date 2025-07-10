import { describe, it, expect } from 'vitest';
import { StandardStrategy } from '../../../src/strategies/StandardStrategy';

describe('StandardStrategy', () => {
  const strategy = new StandardStrategy();

  describe('process - 乐观更新策略', () => {
    it('无未匹配格式符号时，应解析到末尾', () => {
      expect(strategy.process('Hello world', 0)).toBe(11);
      expect(strategy.process('Hello *world*', 0)).toBe(13);
      expect(strategy.process('Hello `code`', 0)).toBe(12);

      expect(strategy.process('Hello [link](url)', 0)).toBe(17);
    });

    it('列表特殊情况处理', () => {
      // 单独的横杠，直接渲染
      expect(strategy.process('-', 0)).toBe(1);

      // 横杠+空格，保持上一个位置
      expect(strategy.process('- ', 0)).toBe(0);

      // 有内容的列表项，正常处理
      expect(strategy.process('- item', 0)).toBe(6);
    });

    it('行内代码的乐观更新', () => {
      // 单独的反引号，保持位置
      expect(strategy.process('`', 0)).toBe(0);

      // 反引号后有内容，自动补全
      const result = strategy.process('`code', 0);
      expect(result).toBe('`code`');
    });

    it('强调格式的乐观更新', () => {
      // 单独的星号，保持位置
      expect(strategy.process('*', 0)).toBe(0);

      // 星号后有内容，自动补全斜体
      const result1 = strategy.process('*hello', 0);
      expect(result1).toBe('*hello*');

      // 双星号后有内容，自动补全加粗
      const result2 = strategy.process('**bold', 0);
      expect(result2).toBe('**bold**');

      // 下划线的处理
      const result3 = strategy.process('_italic', 0);
      expect(result3).toBe('_italic_');

      const result4 = strategy.process('__strong', 0);
      expect(result4).toBe('__strong__');
    });

    it('链接的乐观更新', () => {
      // 单独的方括号，保持位置
      expect(strategy.process('[', 0)).toBe(0);

      // 方括号后有内容，自动补全空链接
      const result = strategy.process('[text', 0);
      expect(result).toBe('[text]()');
    });

    it('混合内容处理', () => {
      // 前面有正常内容，符号在中间
      expect(strategy.process('Hello *', 0)).toBe(6);

      // 符号后面有内容时的乐观更新
      const result = strategy.process('Hello *world', 0);
      expect(result).toBe('Hello *world*');
    });

    it('代码块不视为歧义，直接解析', () => {
      // 代码块可以直接解析到末尾
      expect(strategy.process('```', 0)).toBe(3);
      expect(strategy.process('```js', 0)).toBe(5);
      expect(strategy.process('```js\ncode', 0)).toBe(10);
    });

    it('部分解析场景', () => {
      // 从中间位置开始解析
      expect(strategy.process('Hello *world*', 6)).toBe(13);

      // 中间位置遇到未匹配符号的乐观更新
      const result = strategy.process('Hello *world', 6);
      expect(result).toBe('Hello *world*');
    });

    it('复杂嵌套场景', () => {
      // 多个格式符号，处理第一个
      const result = strategy.process('*hello* and `code', 0);
      // 应该先处理完整的斜体，再到代码处
      expect(result).toBe(12); // '`'符号在位置12
    });

    it('边界情况', () => {
      // 空内容
      expect(strategy.process('', 0)).toBe(0);

      // 已经解析完的内容
      expect(strategy.process('Hello', 5)).toBe(5);

      // 只有格式符号，没有内容
      expect(strategy.process('[', 0)).toBe(0);
      expect(strategy.process('`', 0)).toBe(0);
      expect(strategy.process('*', 0)).toBe(0);
    });
  });
});
