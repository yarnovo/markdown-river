import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StreamingRendererV2 } from '../../src/streaming-renderer-v2.js';

describe('StreamingRendererV2 简单测试', () => {
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

  it('应该处理简单文本', () => {
    renderer.write('Hello');
    renderer.end();

    // 等待一下以确保 DOM 更新
    const content = container.querySelector('[data-node-id="content"]');
    expect(content).toBeTruthy();
    expect(content?.textContent).toBe('Hello');
  });

  it('应该处理加粗文本', () => {
    const input = '**Bold**';
    for (const char of input) {
      renderer.write(char);
    }
    renderer.end();

    const content = container.querySelector('[data-node-id="content"]');
    const strong = content?.querySelector('strong');

    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe('Bold');
  });
});
