import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreamingRendererV2 } from '../../src/streaming-renderer-v2.js';
import { StyleProcessorV2 } from '../../src/infrastructure/style-processor-v2.js';

describe('StreamingRendererV2 集成测试', () => {
  let container: HTMLElement;
  let renderer: StreamingRendererV2;

  beforeEach(() => {
    // 创建测试容器
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // 创建渲染器
    renderer = new StreamingRendererV2({
      container,
      debug: true,
    });
  });

  afterEach(() => {
    // 清理容器
    document.body.removeChild(container);
  });

  describe('基本功能', () => {
    it('应该初始化容器', () => {
      expect(container.innerHTML).toContain('data-node-id="content"');
    });

    it('应该处理简单文本', () => {
      renderer.write('Hello World');
      renderer.end();

      expect(container.textContent).toBe('Hello World');
    });

    it('应该处理加粗文本', () => {
      const input = '**Bold Text**';
      for (const char of input) {
        renderer.write(char);
      }
      renderer.end();

      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong?.textContent).toBe('Bold Text');
    });

    it('应该处理斜体文本', () => {
      const input = '_Italic Text_';
      for (const char of input) {
        renderer.write(char);
      }
      renderer.end();

      const em = container.querySelector('em');
      expect(em).toBeTruthy();
      expect(em?.textContent).toBe('Italic Text');
    });

    it('应该处理嵌套格式', () => {
      const input = '**Bold with _italic_ inside**';
      for (const char of input) {
        renderer.write(char);
      }
      renderer.end();

      const strong = container.querySelector('strong');
      const em = container.querySelector('em');

      expect(strong).toBeTruthy();
      expect(em).toBeTruthy();
      expect(em?.textContent).toBe('italic');
      expect(strong?.textContent).toBe('Bold with italic inside');
    });
  });

  describe('样式应用', () => {
    it('应该应用默认样式', () => {
      renderer.write('**Bold**');
      renderer.end();

      const strong = container.querySelector('strong');
      expect(strong?.classList.contains('font-bold')).toBe(true);
    });

    it('应该支持自定义样式', () => {
      const styleProcessor = new StyleProcessorV2();
      styleProcessor.setTagStyles('strong', ['text-red-500', 'font-black']);

      renderer = new StreamingRendererV2({
        container,
        styleProcessor,
      });

      renderer.write('**Bold**');
      renderer.end();

      const strong = container.querySelector('strong');
      expect(strong?.classList.contains('text-red-500')).toBe(true);
      expect(strong?.classList.contains('font-black')).toBe(true);
    });
  });

  describe('状态管理', () => {
    it('应该正确管理渲染状态', () => {
      expect(renderer.getState()).toBe('idle');

      renderer.write('H');
      expect(renderer.getState()).toBe('rendering');

      renderer.end();
      expect(renderer.getState()).toBe('completed');
    });

    it('应该跟踪输入字符数', () => {
      expect(renderer.getInputCount()).toBe(0);

      renderer.write('Hello');
      expect(renderer.getInputCount()).toBe(5);

      renderer.write(' World');
      expect(renderer.getInputCount()).toBe(11);
    });
  });

  describe('重置功能', () => {
    it('应该能够重置并重用', () => {
      // 第一次渲染
      renderer.write('**First**');
      renderer.end();

      let strong = container.querySelector('strong');
      expect(strong?.textContent).toBe('First');

      // 重置
      renderer.reset();
      expect(renderer.getState()).toBe('idle');
      expect(renderer.getInputCount()).toBe(0);

      // 第二次渲染
      renderer.write('_Second_');
      renderer.end();

      strong = container.querySelector('strong');
      const em = container.querySelector('em');
      expect(strong).toBeFalsy();
      expect(em?.textContent).toBe('Second');
    });
  });

  describe('错误处理', () => {
    it('应该处理不匹配的格式标记', () => {
      renderer.write('**Unclosed bold');
      renderer.end();

      // 应该优雅地处理，不抛出错误
      expect(container.textContent).toContain('Unclosed bold');
    });

    it('应该处理空输入', () => {
      renderer.end();
      expect(renderer.getState()).toBe('completed');
    });
  });

  describe('实时渲染效果', () => {
    it('应该在检测到加粗后立即开始渲染', () => {
      // 输入第一个 *
      renderer.write('*');
      expect(container.querySelector('strong')).toBeFalsy();

      // 输入第二个 * - 乐观更新应该立即创建 strong 标签
      renderer.write('*');
      expect(container.querySelector('strong')).toBeTruthy();
      expect(container.querySelector('strong')?.textContent).toBe('');

      // 输入第一个字母
      renderer.write('B');
      expect(container.querySelector('strong')?.textContent).toBe('B');

      // 继续输入
      renderer.write('old');
      expect(container.querySelector('strong')?.textContent).toBe('Bold');

      // 结束加粗
      renderer.write('**');
      renderer.end();
      expect(container.querySelector('strong')?.textContent).toBe('Bold');
    });
  });
});
