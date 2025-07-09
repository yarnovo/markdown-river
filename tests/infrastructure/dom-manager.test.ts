import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DOMManager } from '../../src/infrastructure/dom-manager';
import { EventBus } from '../../src/infrastructure/event-bus';

// jsdom 提供的 DOM 环境已经包含了 requestAnimationFrame 的 mock

describe('DOMManager', () => {
  let domManager: DOMManager;
  let container: HTMLElement;
  let eventBus: EventBus;

  beforeEach(() => {
    // 创建测试容器
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    eventBus = new EventBus();
    domManager = new DOMManager({
      container,
      batchDelay: 0, // 立即处理，便于测试
      eventBus,
    });
  });

  afterEach(() => {
    // 清理容器
    document.body.removeChild(container);
    vi.clearAllTimers();
  });

  describe('基础 DOM 操作', () => {
    it('应该创建元素并添加到容器', async () => {
      domManager.createElement({
        tag: 'div',
        text: 'Hello World',
      });

      // 等待批处理
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('div');
      expect(element).toBeTruthy();
      expect(element?.textContent).toBe('Hello World');
    });

    it('应该创建带属性的元素', async () => {
      domManager.createElement({
        tag: 'a',
        attributes: {
          href: 'https://example.com',
          target: '_blank',
        },
        text: 'Link',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('a');
      expect(element?.getAttribute('href')).toBe('https://example.com');
      expect(element?.getAttribute('target')).toBe('_blank');
    });

    it('应该创建带类名的元素', async () => {
      domManager.createElement({
        tag: 'span',
        className: 'highlight bold',
        text: 'Styled text',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('span');
      expect(element?.className).toBe('highlight bold');
    });

    it('应该创建嵌套元素', async () => {
      domManager.createElement({
        tag: 'ul',
        children: [
          { tag: 'li', text: 'Item 1' },
          { tag: 'li', text: 'Item 2' },
          { tag: 'li', text: 'Item 3' },
        ],
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      const ul = container.querySelector('ul');
      const items = ul?.querySelectorAll('li');
      expect(items?.length).toBe(3);
      expect(items?.[0].textContent).toBe('Item 1');
      expect(items?.[2].textContent).toBe('Item 3');
    });
  });

  describe('元素更新操作', () => {
    it('应该更新元素文本', async () => {
      const nodeId = domManager.createElement({
        tag: 'p',
        text: 'Original text',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      // 更新文本
      domManager.updateElement(nodeId, { text: 'Updated text' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('p');
      expect(element?.textContent).toBe('Updated text');
    });

    it('应该更新元素属性', async () => {
      const nodeId = domManager.createElement({
        tag: 'input',
        attributes: { type: 'text', value: 'initial' },
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      // 更新属性
      domManager.updateElement(nodeId, {
        attributes: { value: 'updated', disabled: 'true' },
      });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('input') as HTMLInputElement;
      expect(element?.getAttribute('value')).toBe('updated');
      expect(element?.getAttribute('disabled')).toBe('true');
    });

    it('应该更新元素类名', async () => {
      const nodeId = domManager.createElement({
        tag: 'div',
        className: 'old-class',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      // 更新类名
      domManager.updateElement(nodeId, { className: 'new-class' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('div');
      expect(element?.className).toBe('new-class');
    });
  });

  describe('元素删除操作', () => {
    it('应该删除单个元素', async () => {
      const nodeId = domManager.createElement({
        tag: 'div',
        text: 'To be removed',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(container.querySelector('div')).toBeTruthy();

      // 删除元素
      domManager.removeElement(nodeId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(container.querySelector('div')).toBeFalsy();
    });

    it('应该递归删除子元素', async () => {
      const parentId = domManager.createElement({
        tag: 'div',
        children: [
          { tag: 'span', text: 'Child 1' },
          { tag: 'span', text: 'Child 2' },
        ],
      });

      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(container.querySelectorAll('span').length).toBe(2);

      // 删除父元素
      domManager.removeElement(parentId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(container.querySelector('div')).toBeFalsy();
      expect(container.querySelectorAll('span').length).toBe(0);
    });
  });

  describe('批处理机制', () => {
    it('应该批量处理多个操作', async () => {
      const createSpy = vi.fn();
      eventBus.on('dom:create', createSpy);
      const batchSpy = vi.fn();
      eventBus.on('dom:batch-update', batchSpy);

      // 创建多个元素
      domManager.createElement({ tag: 'div', text: '1' });
      domManager.createElement({ tag: 'div', text: '2' });
      domManager.createElement({ tag: 'div', text: '3' });

      // 批处理前不应该有元素
      expect(container.children.length).toBe(0);

      // 等待批处理
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 批处理后应该有3个元素
      expect(container.children.length).toBe(3);
      expect(createSpy).toHaveBeenCalledTimes(3);
      expect(batchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operationCount: 3,
        })
      );
    });

    it('应该在达到最大批处理大小时立即处理', async () => {
      const manager = new DOMManager({
        container,
        batchDelay: 1000, // 长延迟
        maxBatchSize: 3,
        eventBus,
      });

      const batchSpy = vi.fn();
      eventBus.on('dom:batch-update', batchSpy);

      // 创建3个元素（达到最大批处理大小）
      manager.createElement({ tag: 'div', text: '1' });
      manager.createElement({ tag: 'div', text: '2' });
      manager.createElement({ tag: 'div', text: '3' });

      // 应该立即处理，不需要等待延迟
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(container.children.length).toBe(3);
      expect(batchSpy).toHaveBeenCalled();
    });

    it('应该支持手动刷新', async () => {
      const manager = new DOMManager({
        container,
        batchDelay: 1000, // 长延迟
        eventBus,
      });

      manager.createElement({ tag: 'div', text: 'Test' });

      // 手动刷新
      manager.flush();
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(container.children.length).toBe(1);
    });
  });

  describe('文本和属性操作', () => {
    it('应该设置元素文本', async () => {
      const nodeId = domManager.createElement({ tag: 'p' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      domManager.setText(nodeId, 'New text');
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('p');
      expect(element?.textContent).toBe('New text');
    });

    it('应该设置元素属性', async () => {
      const nodeId = domManager.createElement({ tag: 'button' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      domManager.setAttribute(nodeId, 'disabled', 'true');
      domManager.setAttribute(nodeId, 'data-id', '123');
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('button');
      expect(element?.getAttribute('disabled')).toBe('true');
      expect(element?.getAttribute('data-id')).toBe('123');
    });

    it('应该设置元素类名', async () => {
      const nodeId = domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      domManager.setClass(nodeId, 'new-class another-class');
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('div');
      expect(element?.className).toBe('new-class another-class');
    });
  });

  describe('节点操作', () => {
    it('应该添加子节点', async () => {
      const parentId = domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const childId = domManager.createElement({ tag: 'span', text: 'Child' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      domManager.appendChild(parentId, childId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      const parent = container.querySelector('div');
      const child = parent?.querySelector('span');
      expect(child?.textContent).toBe('Child');
    });

    it('应该在指定位置插入节点', async () => {
      // 先创建父节点
      const parentId = domManager.createElement({ tag: 'ul' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 创建两个子节点
      domManager.createElement({ tag: 'li', text: 'First' }, parentId);
      const thirdId = domManager.createElement({ tag: 'li', text: 'Third' }, parentId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 创建要插入的新节点
      const newChildId = domManager.createElement({ tag: 'li', text: 'Second' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 在第三个节点前插入新节点
      domManager.insertBefore(parentId, newChildId, thirdId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      const ul = container.querySelector('ul');
      const items = ul?.querySelectorAll('li');
      expect(items?.length).toBe(3);
      expect(items?.[0].textContent).toBe('First');
      expect(items?.[1].textContent).toBe('Second');
      expect(items?.[2].textContent).toBe('Third');
    });
  });

  describe('缓存管理', () => {
    it('应该缓存创建的节点', async () => {
      const nodeId = domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = domManager.getElement(nodeId);
      expect(element).toBeTruthy();
      expect(element?.tagName.toLowerCase()).toBe('div');
    });

    it('应该在删除节点时清理缓存', async () => {
      const nodeId = domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(domManager.getElement(nodeId)).toBeTruthy();

      domManager.removeElement(nodeId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(domManager.getElement(nodeId)).toBeFalsy();
    });

    it('应该提供缓存统计信息', async () => {
      domManager.createElement({ tag: 'div' });
      domManager.createElement({ tag: 'span' });
      domManager.createElement({ tag: 'p' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const stats = domManager.getCacheStats();
      expect(stats.size).toBe(3);
      expect(stats.nodeIds.length).toBe(3);
    });

    it('应该支持禁用缓存', async () => {
      const manager = new DOMManager({
        container,
        enableCache: false,
        batchDelay: 0,
      });

      const nodeId = manager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 即使禁用缓存，仍然可以从 DOM 中找到元素
      const element = manager.getElement(nodeId);
      expect(element).toBeTruthy();
      expect(element?.tagName.toLowerCase()).toBe('div');

      // 但缓存应该是空的
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('清空操作', () => {
    it('应该清空所有内容', async () => {
      domManager.createElement({ tag: 'div' });
      domManager.createElement({ tag: 'span' });
      domManager.createElement({ tag: 'p' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(container.children.length).toBe(3);

      domManager.clear();
      expect(container.children.length).toBe(0);
      expect(domManager.getCacheStats().size).toBe(0);
    });

    it('应该取消待处理的操作', () => {
      // 创建长延迟的管理器
      const manager = new DOMManager({
        container,
        batchDelay: 1000,
      });

      manager.createElement({ tag: 'div' });
      manager.createElement({ tag: 'span' });

      // 清空前容器应该是空的（还在等待批处理）
      expect(container.children.length).toBe(0);

      manager.clear();

      // 清空后容器仍然是空的，且操作被取消
      expect(container.children.length).toBe(0);
    });
  });

  describe('事件发射', () => {
    it('应该在创建节点时发射事件', async () => {
      const createSpy = vi.fn();
      eventBus.on('dom:create', createSpy);

      domManager.createElement({
        tag: 'div',
        text: 'Test',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeType: 'div',
          nodeId: expect.stringContaining('node-'),
        })
      );
    });

    it('应该在更新节点时发射事件', async () => {
      const updateSpy = vi.fn();
      eventBus.on('dom:update', updateSpy);

      const nodeId = domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      domManager.updateElement(nodeId, { text: 'Updated' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId,
          updateType: 'text',
        })
      );
    });

    it('应该在删除节点时发射事件', async () => {
      const removeSpy = vi.fn();
      eventBus.on('dom:remove', removeSpy);

      const nodeId = domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      domManager.removeElement(nodeId);
      await new Promise(resolve => requestAnimationFrame(resolve));

      expect(removeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId,
          recursive: true,
        })
      );
    });
  });

  describe('边界情况处理', () => {
    it('应该处理空配置', async () => {
      domManager.createElement({ tag: 'div' });
      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('div');
      expect(element).toBeTruthy();
      expect(element?.textContent).toBe('');
      expect(element?.className).toBe('');
    });

    it('应该忽略不存在的节点操作', async () => {
      // 这些操作不应该抛出错误
      domManager.updateElement('non-existent', { text: 'Test' });
      domManager.removeElement('non-existent');
      domManager.setText('non-existent', 'Test');
      domManager.setAttribute('non-existent', 'attr', 'value');
      domManager.setClass('non-existent', 'class');

      await new Promise(resolve => requestAnimationFrame(resolve));

      // 容器应该保持为空
      expect(container.children.length).toBe(0);
    });

    it('应该处理特殊字符的文本', async () => {
      domManager.createElement({
        tag: 'div',
        text: '<script>alert("XSS")</script>',
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      const element = container.querySelector('div');
      // textContent 会自动转义 HTML
      expect(element?.textContent).toBe('<script>alert("XSS")</script>');
      expect(element?.innerHTML).not.toContain('<script>');
    });

    it('应该处理深度嵌套的结构', async () => {
      domManager.createElement({
        tag: 'div',
        children: [
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                children: [
                  {
                    tag: 'span',
                    text: 'Deep nested',
                  },
                ],
              },
            ],
          },
        ],
      });

      await new Promise(resolve => requestAnimationFrame(resolve));

      const span = container.querySelector('div > ul > li > span');
      expect(span?.textContent).toBe('Deep nested');
    });
  });
});
