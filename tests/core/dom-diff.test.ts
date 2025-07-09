/**
 * DOM 差分模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DOMDiff, DOMSnapshot, DOMOperation } from '../../src/core/dom-diff.js';
import { EventBus } from '../../src/infrastructure/event-bus.js';

describe('DOM 差分模块', () => {
  let domDiff: DOMDiff;
  let eventBus: EventBus;
  let emittedOperations: DOMOperation[] = [];

  beforeEach(() => {
    eventBus = new EventBus();
    domDiff = new DOMDiff({ eventBus });
    emittedOperations = [];

    eventBus.on('dom:diff', (data: unknown) => {
      const diffData = data as { operations: DOMOperation[] };
      emittedOperations = diffData.operations;
    });
  });

  describe('初始快照', () => {
    it('应该为初始快照生成创建操作', () => {
      const snapshot: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        children: [
          {
            type: 'element',
            tagName: 'p',
            children: [
              {
                type: 'text',
                textContent: 'Hello World',
              },
            ],
          },
        ],
      };

      const operations = domDiff.applySnapshot(snapshot);

      expect(operations).toHaveLength(3);
      expect(operations[0]).toMatchObject({
        type: 'create',
        parent: null,
        node: expect.objectContaining({
          type: 'element',
          tagName: 'div',
        }),
      });
      expect(operations[1]).toMatchObject({
        type: 'create',
        parent: expect.any(String),
        node: expect.objectContaining({
          type: 'element',
          tagName: 'p',
        }),
      });
      expect(operations[2]).toMatchObject({
        type: 'create',
        parent: expect.any(String),
        node: expect.objectContaining({
          type: 'text',
          textContent: 'Hello World',
        }),
      });
    });

    it('应该为节点分配唯一ID', () => {
      const snapshot: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        children: [
          { type: 'element', tagName: 'p' },
          { type: 'element', tagName: 'span' },
        ],
      };

      const operations = domDiff.applySnapshot(snapshot);
      const nodeIds = operations.map(op => (op.type === 'create' ? op.node.nodeId : null));
      const uniqueIds = new Set(nodeIds);

      expect(uniqueIds.size).toBe(nodeIds.length);
    });
  });

  describe('文本内容更新', () => {
    it('应该检测文本内容变化', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'text',
            textContent: 'Hello',
          },
        ],
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'text',
            textContent: 'Hello World',
          },
        ],
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({
        type: 'update',
        nodeId: expect.any(String),
        changes: {
          textContent: 'Hello World',
        },
      });
    });
  });

  describe('属性更新', () => {
    it('应该检测类名变化', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        className: 'old-class',
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        className: 'new-class',
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({
        type: 'update',
        changes: {
          className: 'new-class',
        },
      });
    });

    it('应该检测属性变化', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'a',
        attributes: { href: '#old' },
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'a',
        attributes: { href: '#new', target: '_blank' },
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      expect(operations).toHaveLength(1);
      expect(operations[0]).toMatchObject({
        type: 'update',
        changes: {
          attributes: { href: '#new', target: '_blank' },
        },
      });
    });
  });

  describe('节点增删', () => {
    it('应该检测新增节点', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'ul',
        children: [
          { type: 'element', tagName: 'li', children: [{ type: 'text', textContent: 'Item 1' }] },
        ],
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'ul',
        children: [
          { type: 'element', tagName: 'li', children: [{ type: 'text', textContent: 'Item 1' }] },
          { type: 'element', tagName: 'li', children: [{ type: 'text', textContent: 'Item 2' }] },
        ],
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      // 应该有2个创建操作：li 和 text
      const createOps = operations.filter(op => op.type === 'create');
      expect(createOps).toHaveLength(2);
      expect(createOps[0].node.tagName).toBe('li');
      expect(createOps[1].node.textContent).toBe('Item 2');
    });

    it('应该检测删除节点', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'ul',
        children: [
          { type: 'element', tagName: 'li', children: [{ type: 'text', textContent: 'Item 1' }] },
          { type: 'element', tagName: 'li', children: [{ type: 'text', textContent: 'Item 2' }] },
        ],
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'ul',
        children: [
          { type: 'element', tagName: 'li', children: [{ type: 'text', textContent: 'Item 1' }] },
        ],
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      // 应该有2个删除操作：li 和 text
      const deleteOps = operations.filter(op => op.type === 'delete');
      expect(deleteOps).toHaveLength(2);
    });
  });

  describe('节点替换', () => {
    it('应该在标签名变化时替换节点', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        children: [{ type: 'text', textContent: 'Content' }],
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'p',
        children: [{ type: 'text', textContent: 'Content' }],
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      // 应该有1个删除和2个创建操作
      expect(operations.filter(op => op.type === 'delete')).toHaveLength(1);
      expect(operations.filter(op => op.type === 'create')).toHaveLength(2);
    });
  });

  describe('复杂场景', () => {
    it('应该处理嵌套结构的多种变化', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        className: 'container',
        children: [
          {
            type: 'element',
            tagName: 'h1',
            children: [{ type: 'text', textContent: 'Title' }],
          },
          {
            type: 'element',
            tagName: 'p',
            children: [{ type: 'text', textContent: 'Paragraph' }],
          },
        ],
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        className: 'container updated',
        children: [
          {
            type: 'element',
            tagName: 'h1',
            children: [{ type: 'text', textContent: 'New Title' }],
          },
          {
            type: 'element',
            tagName: 'p',
            className: 'highlight',
            children: [{ type: 'text', textContent: 'Paragraph' }],
          },
          {
            type: 'element',
            tagName: 'footer',
            children: [{ type: 'text', textContent: 'Footer' }],
          },
        ],
      };

      domDiff.applySnapshot(snapshot1);
      const operations = domDiff.applySnapshot(snapshot2);

      // 验证各种操作
      expect(
        operations.some(op => op.type === 'update' && op.changes.className === 'container updated')
      ).toBe(true);

      expect(
        operations.some(op => op.type === 'update' && op.changes.textContent === 'New Title')
      ).toBe(true);

      expect(
        operations.some(op => op.type === 'update' && op.changes.className === 'highlight')
      ).toBe(true);

      expect(
        operations.filter(op => op.type === 'create' && op.node.tagName === 'footer')
      ).toHaveLength(1);
    });
  });

  describe('状态管理', () => {
    it('应该正确维护节点映射', () => {
      const snapshot: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        children: [
          { type: 'element', tagName: 'p' },
          { type: 'element', tagName: 'span' },
        ],
      };

      domDiff.applySnapshot(snapshot);
      const nodeMap = domDiff.getNodeMap();

      expect(nodeMap.size).toBe(3); // div, p, span
    });

    it('应该支持重置状态', () => {
      const snapshot: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
      };

      domDiff.applySnapshot(snapshot);
      domDiff.reset();

      expect(domDiff.getCurrentSnapshot()).toBeNull();
      expect(domDiff.getNodeMap().size).toBe(0);
    });
  });

  describe('事件发射', () => {
    it('应该在有操作时发射事件', () => {
      const snapshot1: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
      };

      const snapshot2: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
        className: 'updated',
      };

      domDiff.applySnapshot(snapshot1);
      domDiff.applySnapshot(snapshot2);

      expect(emittedOperations).toHaveLength(1);
      expect(emittedOperations[0]).toMatchObject({
        type: 'update',
        changes: { className: 'updated' },
      });
    });

    it('应该在无变化时不发射事件', () => {
      const snapshot: DOMSnapshot = {
        type: 'element',
        tagName: 'div',
      };

      domDiff.applySnapshot(snapshot);
      emittedOperations = [];
      domDiff.applySnapshot(snapshot);

      expect(emittedOperations).toHaveLength(0);
    });
  });
});
