import { describe, it, expect, beforeEach } from 'vitest';
import { SnapshotRenderer } from '../../src/core/snapshot-renderer.js';
import { EventBus } from '../../src/infrastructure/event-bus.js';
import { StyleProcessorV2 } from '../../src/infrastructure/style-processor-v2.js';
import { Token } from '../../src/core/optimistic-parser.js';
import { DOMSnapshot } from '../../src/core/dom-diff.js';

describe('SnapshotRenderer', () => {
  let renderer: SnapshotRenderer;
  let eventBus: EventBus;
  let styleProcessor: StyleProcessorV2;

  beforeEach(() => {
    eventBus = new EventBus();
    styleProcessor = new StyleProcessorV2();
    renderer = new SnapshotRenderer({
      eventBus,
      styleProcessor,
    });
  });

  describe('基本功能', () => {
    it('应该创建初始容器快照', () => {
      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot).toEqual({
        nodeId: 'content',
        type: 'element',
        tagName: 'div',
        attributes: {
          id: 'content',
          'data-node-id': 'content',
        },
        children: [],
      });
    });

    it('应该处理文本令牌', () => {
      const token: Token = { type: 'TEXT', content: 'Hello' };
      eventBus.emit('parser:token', { token, timestamp: Date.now() });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(1);
      expect(snapshot.children![0]).toMatchObject({
        type: 'text',
        textContent: 'Hello',
      });
    });

    it('应该处理加粗令牌', () => {
      const tokens: Token[] = [
        { type: 'BOLD_START' },
        { type: 'TEXT', content: 'Bold' },
        { type: 'BOLD_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(1);
      expect(snapshot.children![0]).toMatchObject({
        type: 'element',
        tagName: 'strong',
        children: [
          {
            type: 'text',
            textContent: 'Bold',
          },
        ],
      });
    });

    it('应该处理斜体令牌', () => {
      const tokens: Token[] = [
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'Italic' },
        { type: 'ITALIC_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(1);
      expect(snapshot.children![0]).toMatchObject({
        type: 'element',
        tagName: 'em',
        children: [
          {
            type: 'text',
            textContent: 'Italic',
          },
        ],
      });
    });

    it('应该处理代码令牌', () => {
      const tokens: Token[] = [
        { type: 'CODE_START' },
        { type: 'TEXT', content: 'code' },
        { type: 'CODE_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(1);
      expect(snapshot.children![0]).toMatchObject({
        type: 'element',
        tagName: 'code',
        children: [
          {
            type: 'text',
            textContent: 'code',
          },
        ],
      });
    });
  });

  describe('嵌套结构', () => {
    it('应该处理嵌套的格式', () => {
      const tokens: Token[] = [
        { type: 'BOLD_START' },
        { type: 'TEXT', content: 'Bold with ' },
        { type: 'ITALIC_START' },
        { type: 'TEXT', content: 'italic' },
        { type: 'ITALIC_END' },
        { type: 'TEXT', content: ' inside' },
        { type: 'BOLD_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(1);

      const boldNode = snapshot.children![0];
      expect(boldNode.tagName).toBe('strong');
      expect(boldNode.children).toHaveLength(3);

      // 检查嵌套的斜体
      const italicNode = boldNode.children![1];
      expect(italicNode.tagName).toBe('em');
      expect((italicNode.children![0] as any).textContent).toBe('italic');
    });
  });

  describe('样式应用', () => {
    it('应该应用样式到元素', () => {
      // 设置样式
      styleProcessor.setTagStyles('strong', ['font-bold', 'text-gray-900']);

      const tokens: Token[] = [
        { type: 'BOLD_START' },
        { type: 'TEXT', content: 'Bold' },
        { type: 'BOLD_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      const boldNode = snapshot.children![0];
      expect(boldNode.className).toBe('font-bold text-gray-900');
    });
  });

  describe('事件发送', () => {
    it('应该在每个令牌处理后发送快照事件', () => {
      let eventCount = 0;
      let lastSnapshot: DOMSnapshot | undefined;
      let lastVersion = 0;

      eventBus.on('snapshot:updated', (event: any) => {
        const { snapshot, version } = event as { snapshot: DOMSnapshot; version: number };
        eventCount++;
        lastSnapshot = snapshot;
        lastVersion = version;
      });

      const tokens: Token[] = [
        { type: 'TEXT', content: 'Hello' },
        { type: 'TEXT', content: ' ' },
        { type: 'TEXT', content: 'World' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      expect(eventCount).toBe(3);
      expect(lastVersion).toBe(3);
      expect(lastSnapshot!.children).toHaveLength(3);
    });
  });

  describe('段落处理', () => {
    it('应该处理段落令牌', () => {
      const tokens: Token[] = [
        { type: 'PARAGRAPH_START' },
        { type: 'TEXT', content: 'This is a paragraph' },
        { type: 'PARAGRAPH_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(1);
      expect(snapshot.children![0]).toMatchObject({
        type: 'element',
        tagName: 'p',
        children: [
          {
            type: 'text',
            textContent: 'This is a paragraph',
          },
        ],
      });
    });
  });

  describe('换行处理', () => {
    it('应该处理换行令牌', () => {
      const tokens: Token[] = [
        { type: 'TEXT', content: 'Line 1' },
        { type: 'LINE_BREAK' },
        { type: 'TEXT', content: 'Line 2' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(3);
      expect(snapshot.children![1]).toMatchObject({
        type: 'element',
        tagName: 'br',
      });
    });
  });

  describe('重置功能', () => {
    it('应该重置所有状态', () => {
      // 先添加一些内容
      const tokens: Token[] = [
        { type: 'BOLD_START' },
        { type: 'TEXT', content: 'Bold' },
        { type: 'BOLD_END' },
      ];

      tokens.forEach(token => {
        eventBus.emit('parser:token', { token, timestamp: Date.now() });
      });

      // 重置
      renderer.reset();

      // 检查状态
      const snapshot = renderer.getCurrentSnapshot();
      expect(snapshot.children).toHaveLength(0);
      expect(snapshot.nodeId).toBe('content');
    });
  });
});
