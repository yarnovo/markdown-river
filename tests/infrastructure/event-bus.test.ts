import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventBus,
  EventType,
  ParseEventData,
  RenderEventData,
} from '../../src/infrastructure/index.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('基础功能', () => {
    it('应该能够监听和触发事件', async () => {
      const handler = vi.fn();
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test content',
      };

      eventBus.on(EventType.PARSE_START, handler);
      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'test content',
          timestamp: expect.any(Number),
        })
      );
    });

    it('应该能够取消监听', async () => {
      const handler = vi.fn();
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test',
      };

      eventBus.on(EventType.PARSE_START, handler);
      eventBus.off(EventType.PARSE_START, handler);
      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(handler).not.toHaveBeenCalled();
    });

    it('应该支持一次性监听', async () => {
      const handler = vi.fn();
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test',
      };

      eventBus.once(EventType.PARSE_START, handler);

      await eventBus.emit(EventType.PARSE_START, eventData);
      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('优先级处理', () => {
    it('应该按优先级顺序执行监听器', async () => {
      const results: number[] = [];
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test',
      };

      eventBus.on(EventType.PARSE_START, () => results.push(1), { priority: 1 });
      eventBus.on(EventType.PARSE_START, () => results.push(3), { priority: 3 });
      eventBus.on(EventType.PARSE_START, () => results.push(2), { priority: 2 });

      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(results).toEqual([3, 2, 1]);
    });
  });

  describe('过滤功能', () => {
    it('应该根据过滤条件决定是否执行监听器', async () => {
      const handler = vi.fn();
      const eventData1: ParseEventData = {
        timestamp: Date.now(),
        content: 'important',
      };
      const eventData2: ParseEventData = {
        timestamp: Date.now(),
        content: 'normal',
      };

      eventBus.on(EventType.PARSE_START, handler, {
        filter: data => (data as ParseEventData).content === 'important',
      });

      await eventBus.emit(EventType.PARSE_START, eventData1);
      await eventBus.emit(EventType.PARSE_START, eventData2);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ content: 'important' }));
    });
  });

  describe('异步处理', () => {
    it('应该等待异步监听器执行完成', async () => {
      const results: string[] = [];
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test',
      };

      eventBus.on(EventType.PARSE_START, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push('async1');
      });

      eventBus.on(EventType.PARSE_START, async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        results.push('async2');
      });

      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(results).toContain('async1');
      expect(results).toContain('async2');
    });

    it('应该处理监听器中的错误', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const normalHandler = vi.fn();
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test',
      };

      eventBus.on(
        EventType.PARSE_START,
        () => {
          throw new Error('Handler error');
        },
        { priority: 2 }
      );

      eventBus.on(EventType.PARSE_START, normalHandler, { priority: 1 });

      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(consoleError).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled(); // 其他监听器仍应执行

      consoleError.mockRestore();
    });
  });

  describe('工具方法', () => {
    it('应该正确返回监听器数量', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      expect(eventBus.getListenerCount()).toBe(0);
      expect(eventBus.getListenerCount(EventType.PARSE_START)).toBe(0);

      eventBus.on(EventType.PARSE_START, handler1);
      eventBus.on(EventType.PARSE_START, handler2);
      eventBus.on(EventType.RENDER_START, handler1);

      expect(eventBus.getListenerCount()).toBe(3);
      expect(eventBus.getListenerCount(EventType.PARSE_START)).toBe(2);
      expect(eventBus.getListenerCount(EventType.RENDER_START)).toBe(1);
    });

    it('应该返回所有事件类型', () => {
      const handler = vi.fn();

      eventBus.on(EventType.PARSE_START, handler);
      eventBus.on(EventType.RENDER_START, handler);
      eventBus.on('custom:event', handler);

      const eventTypes = eventBus.getEventTypes();
      expect(eventTypes).toContain(EventType.PARSE_START);
      expect(eventTypes).toContain(EventType.RENDER_START);
      expect(eventTypes).toContain('custom:event');
    });

    it('应该能够清除所有监听器', () => {
      const handler = vi.fn();

      eventBus.on(EventType.PARSE_START, handler);
      eventBus.on(EventType.RENDER_START, handler);

      expect(eventBus.getListenerCount()).toBe(2);

      eventBus.clear();

      expect(eventBus.getListenerCount()).toBe(0);
      expect(eventBus.getEventTypes()).toHaveLength(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理不存在的事件类型', async () => {
      const eventData: ParseEventData = {
        timestamp: Date.now(),
        content: 'test',
      };

      // 不应该抛出错误
      await expect(eventBus.emit(EventType.PARSE_START, eventData)).resolves.toBeUndefined();
    });

    it('应该处理重复取消同一个监听器', () => {
      const handler = vi.fn();

      eventBus.on(EventType.PARSE_START, handler);
      eventBus.off(EventType.PARSE_START, handler);

      // 不应该抛出错误
      expect(() => {
        eventBus.off(EventType.PARSE_START, handler);
      }).not.toThrow();
    });

    it('应该自动添加时间戳', async () => {
      const handler = vi.fn();
      const eventData = {
        content: 'test',
      } as ParseEventData;

      eventBus.on(EventType.PARSE_START, handler);
      await eventBus.emit(EventType.PARSE_START, eventData);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('多种事件类型', () => {
    it('应该支持多种事件数据类型', async () => {
      const parseHandler = vi.fn();
      const renderHandler = vi.fn();

      const parseData: ParseEventData = {
        timestamp: Date.now(),
        content: 'parse test',
        position: 10,
      };

      const renderData: RenderEventData = {
        timestamp: Date.now(),
        elementCount: 5,
        duration: 100,
      };

      eventBus.on(EventType.PARSE_START, parseHandler);
      eventBus.on(EventType.RENDER_START, renderHandler);

      await eventBus.emit(EventType.PARSE_START, parseData);
      await eventBus.emit(EventType.RENDER_START, renderData);

      expect(parseHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'parse test',
          position: 10,
        })
      );

      expect(renderHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          elementCount: 5,
          duration: 100,
        })
      );
    });
  });
});
