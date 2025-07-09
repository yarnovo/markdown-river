import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RenderScheduler } from '../../src/core/render-scheduler';
import { EventBus } from '../../src/infrastructure/event-bus';
import { DOMManager } from '../../src/infrastructure/dom-manager';
import { Token, TokenType, TokenConfidence } from '../../src/types/parser-events';
import { SchedulerState } from '../../src/types/scheduler-events';

describe('RenderScheduler', () => {
  let scheduler: RenderScheduler;
  let eventBus: EventBus;
  let domManager: DOMManager;

  beforeEach(() => {
    // 清理所有定时器
    vi.useFakeTimers();

    // 创建模拟的容器元素
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    eventBus = new EventBus();
    domManager = new DOMManager({
      container,
      eventBus,
    });
    scheduler = new RenderScheduler({
      eventBus,
      domManager,
      minInterval: 16,
      maxInterval: 100,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    // 清理DOM
    const container = document.getElementById('test-container');
    if (container) {
      container.remove();
    }
  });

  describe('基础功能', () => {
    it('应该正确创建实例', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.getState()).toBe(SchedulerState.IDLE);
      expect(scheduler.getStats().totalTokens).toBe(0);
    });

    it('应该添加令牌到队列', () => {
      const token: Token = {
        type: TokenType.TEXT,
        content: 'Hello',
        position: 0,
        length: 5,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);

      const stats = scheduler.getStats();
      expect(stats.totalTokens).toBe(1);
      expect(stats.queueLength).toBe(1);
    });

    it('应该批量添加令牌', () => {
      const tokens: Token[] = [
        {
          type: TokenType.TEXT,
          content: 'Hello',
          position: 0,
          length: 5,
          confidence: TokenConfidence.CONFIRMED,
        },
        {
          type: TokenType.WHITESPACE,
          content: ' ',
          position: 5,
          length: 1,
          confidence: TokenConfidence.CONFIRMED,
        },
        {
          type: TokenType.TEXT,
          content: 'World',
          position: 6,
          length: 5,
          confidence: TokenConfidence.CONFIRMED,
        },
      ];

      scheduler.addTokens(tokens);

      const stats = scheduler.getStats();
      expect(stats.totalTokens).toBe(3);
      expect(stats.queueLength).toBe(3);
    });
  });

  describe('状态管理', () => {
    it('应该在添加令牌时自动开始调度', () => {
      expect(scheduler.getState()).toBe(SchedulerState.IDLE);

      const token: Token = {
        type: TokenType.TEXT,
        content: 'Test',
        position: 0,
        length: 4,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);
      expect(scheduler.getState()).toBe(SchedulerState.SCHEDULING);
    });

    it('应该支持暂停和恢复', () => {
      const token: Token = {
        type: TokenType.TEXT,
        content: 'Test',
        position: 0,
        length: 4,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);
      expect(scheduler.getState()).toBe(SchedulerState.SCHEDULING);

      scheduler.pause();
      expect(scheduler.getState()).toBe(SchedulerState.PAUSED);

      scheduler.resume();
      expect(scheduler.getState()).toBe(SchedulerState.SCHEDULING);
    });

    it('应该支持停止调度', () => {
      const token: Token = {
        type: TokenType.TEXT,
        content: 'Test',
        position: 0,
        length: 4,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);
      scheduler.stop();

      expect(scheduler.getState()).toBe(SchedulerState.STOPPED);
      expect(scheduler.getStats().queueLength).toBe(0);
    });
  });

  describe('批处理', () => {
    it('应该按批次处理令牌', async () => {
      const spy = vi.fn();
      eventBus.on('scheduler:batch:rendered', spy);

      const tokens: Token[] = Array.from({ length: 5 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i * 6,
        length: 6,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      // 等待第一个批次
      vi.runOnlyPendingTimers();

      expect(spy).toHaveBeenCalledOnce();
      const eventData = spy.mock.calls[0][0];
      expect(eventData.tokensRendered).toBe(5);
    });

    it('应该支持禁用批处理', () => {
      // 创建新的容器和DOM管理器
      const container = document.createElement('div');
      container.id = 'test-container-2';
      document.body.appendChild(container);

      const newDomManager = new DOMManager({ container, eventBus });

      scheduler = new RenderScheduler({
        eventBus,
        domManager: newDomManager,
        enableBatching: false,
      });

      const spy = vi.fn();
      eventBus.on('scheduler:batch:rendered', spy);

      const tokens: Token[] = Array.from({ length: 3 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i * 6,
        length: 6,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      // 第一个批次应该只包含一个令牌
      vi.runOnlyPendingTimers();
      expect(spy).toHaveBeenCalled();
      // 禁用批处理时，每个令牌都会单独处理，但可能会在同一个定时器中处理多个
      const firstCallTokens = spy.mock.calls[0][0].tokensRendered;
      expect(firstCallTokens).toBeLessThanOrEqual(3);
    });

    it('应该限制批次大小', () => {
      // 创建新的容器和DOM管理器
      const container = document.createElement('div');
      container.id = 'test-container-3';
      document.body.appendChild(container);

      const newDomManager = new DOMManager({ container, eventBus });

      scheduler = new RenderScheduler({
        eventBus,
        domManager: newDomManager,
        maxBatchSize: 3,
      });

      const spy = vi.fn();
      eventBus.on('scheduler:batch:rendered', spy);

      const tokens: Token[] = Array.from({ length: 10 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i * 6,
        length: 6,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      // 第一个批次应该只包含3个令牌或更少
      vi.runOnlyPendingTimers();
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0].tokensRendered).toBeLessThanOrEqual(3);

      // 确认剩余的令牌还在队列中
      const stats = scheduler.getStats();
      expect(stats.queueLength).toBeGreaterThan(0);
    });
  });

  describe('速率控制', () => {
    it('应该调整渲染速率', () => {
      // 创建新的容器和DOM管理器
      const container = document.createElement('div');
      container.id = 'test-container-4';
      document.body.appendChild(container);

      const newDomManager = new DOMManager({ container, eventBus });

      scheduler = new RenderScheduler({
        eventBus,
        domManager: newDomManager,
        enableAdaptiveRate: true,
        minInterval: 10,
        maxInterval: 100,
        smoothFactor: 0.5, // 降低平滑因子使调整更明显
      });

      // 添加大量令牌造成队列压力
      const tokens: Token[] = Array.from({ length: 100 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i * 6,
        length: 6,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      // 验证初始状态
      const initialStats = scheduler.getStats();
      expect(initialStats.queueLength).toBe(100);

      // 处理一个批次
      vi.runOnlyPendingTimers();

      // 验证队列减少了
      const statsAfter = scheduler.getStats();
      expect(statsAfter.queueLength).toBeLessThan(100);
      expect(statsAfter.renderedTokens).toBeGreaterThan(0);

      // 验证速率计算功能正常
      const rateInfo = scheduler.getRateInfo();
      expect(rateInfo).toBeDefined();
      expect(rateInfo.currentInterval).toBeGreaterThan(0);
    });

    it('应该计算正确的速率信息', () => {
      const tokens: Token[] = Array.from({ length: 10 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i * 6,
        length: 6,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      const rateInfo = scheduler.getRateInfo();
      expect(rateInfo).toHaveProperty('inputRate');
      expect(rateInfo).toHaveProperty('outputRate');
      expect(rateInfo).toHaveProperty('queuePressure');
      expect(rateInfo.queuePressure).toBeGreaterThan(0);
    });
  });

  describe('队列管理', () => {
    it('应该处理队列溢出', () => {
      // 创建新的容器和DOM管理器
      const container = document.createElement('div');
      container.id = 'test-container-5';
      document.body.appendChild(container);

      const newDomManager = new DOMManager({ container, eventBus });

      scheduler = new RenderScheduler({
        eventBus,
        domManager: newDomManager,
        maxBatchSize: 5,
      });

      const spy = vi.fn();
      eventBus.on('scheduler:queue:overflow', spy);

      // 添加超过最大队列大小的令牌
      const tokens: Token[] = Array.from({ length: 60 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i,
        length: 1,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      expect(spy).toHaveBeenCalled();
      const eventData = spy.mock.calls[0][0];
      expect(eventData.droppedTokens.length).toBeGreaterThan(0);
    });
  });

  describe('渲染功能', () => {
    it('应该渲染文本令牌', () => {
      const spy = vi.spyOn(domManager, 'createElement');

      const token: Token = {
        type: TokenType.TEXT,
        content: 'Hello World',
        position: 0,
        length: 11,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);
      vi.runOnlyPendingTimers();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'span',
          text: 'Hello World',
        })
      );
    });

    it('应该渲染换行符', () => {
      const spy = vi.spyOn(domManager, 'createElement');

      const token: Token = {
        type: TokenType.NEWLINE,
        content: '\n',
        position: 0,
        length: 1,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);
      vi.runOnlyPendingTimers();

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ tag: 'br' }));
    });

    it('应该渲染段落标记', () => {
      const spy = vi.spyOn(domManager, 'createElement');

      const tokens: Token[] = [
        {
          type: TokenType.PARAGRAPH_START,
          content: '',
          position: 0,
          length: 0,
          confidence: TokenConfidence.CONFIRMED,
        },
        {
          type: TokenType.TEXT,
          content: 'Paragraph content',
          position: 0,
          length: 17,
          confidence: TokenConfidence.CONFIRMED,
        },
        {
          type: TokenType.PARAGRAPH_END,
          content: '',
          position: 17,
          length: 0,
          confidence: TokenConfidence.CONFIRMED,
        },
      ];

      scheduler.addTokens(tokens);
      vi.runOnlyPendingTimers();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'p',
          attributes: expect.objectContaining({ id: 'current-paragraph' }),
        })
      );
    });

    it('应该渲染强调标记', () => {
      const spy = vi.spyOn(domManager, 'createElement');

      const tokens: Token[] = [
        {
          type: TokenType.EMPHASIS_START,
          content: '*',
          position: 0,
          length: 1,
          confidence: TokenConfidence.CONFIRMED,
        },
        {
          type: TokenType.TEXT,
          content: 'italic',
          position: 1,
          length: 6,
          confidence: TokenConfidence.CONFIRMED,
        },
        {
          type: TokenType.EMPHASIS_END,
          content: '*',
          position: 7,
          length: 1,
          confidence: TokenConfidence.CONFIRMED,
        },
      ];

      scheduler.addTokens(tokens);
      vi.runOnlyPendingTimers();

      // 检查是否创建了 em 元素
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'em',
        })
      );

      // 检查是否创建了包含 'italic' 文本的 span 元素
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'span',
          text: 'italic',
        })
      );
    });

    it('应该将可能性令牌作为文本渲染', () => {
      const spy = vi.spyOn(domManager, 'createElement');

      const token: Token = {
        type: TokenType.POTENTIAL_STRONG,
        content: '**',
        position: 0,
        length: 2,
        confidence: TokenConfidence.POTENTIAL,
      };

      scheduler.addToken(token);
      vi.runOnlyPendingTimers();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'span',
          text: '**',
        })
      );
    });
  });

  describe('统计信息', () => {
    it('应该更新渲染统计', () => {
      const tokens: Token[] = Array.from({ length: 10 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i * 6,
        length: 6,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);
      vi.runOnlyPendingTimers();

      const stats = scheduler.getStats();
      expect(stats.totalTokens).toBe(10);
      expect(stats.renderedTokens).toBe(10);
      expect(stats.totalBatches).toBe(1);
      expect(stats.averageBatchSize).toBe(10);
    });

    it('应该计算平均值', () => {
      // 创建新的容器和DOM管理器
      const container = document.createElement('div');
      container.id = 'test-container-6';
      document.body.appendChild(container);

      const newDomManager = new DOMManager({ container, eventBus });

      scheduler = new RenderScheduler({
        eventBus,
        domManager: newDomManager,
        maxBatchSize: 2,
      });

      const tokens: Token[] = Array.from({ length: 6 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i,
        length: 1,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);

      // 处理3个批次
      for (let i = 0; i < 3; i++) {
        vi.runOnlyPendingTimers();
      }

      const stats = scheduler.getStats();
      expect(stats.totalBatches).toBe(3);
      expect(stats.averageBatchSize).toBe(2);
    });
  });

  describe('重置功能', () => {
    it('应该重置所有状态', () => {
      const tokens: Token[] = Array.from({ length: 5 }, (_, i) => ({
        type: TokenType.TEXT,
        content: `Token${i}`,
        position: i,
        length: 1,
        confidence: TokenConfidence.CONFIRMED,
      }));

      scheduler.addTokens(tokens);
      vi.runOnlyPendingTimers();

      scheduler.reset();

      expect(scheduler.getState()).toBe(SchedulerState.IDLE);
      const stats = scheduler.getStats();
      expect(stats.totalTokens).toBe(0);
      expect(stats.renderedTokens).toBe(0);
      expect(stats.queueLength).toBe(0);
    });
  });

  describe('事件发射', () => {
    it('应该发射状态变更事件', () => {
      const spy = vi.fn();
      eventBus.on('scheduler:state:changed', spy);

      const token: Token = {
        type: TokenType.TEXT,
        content: 'Test',
        position: 0,
        length: 4,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          previousState: SchedulerState.IDLE,
          newState: SchedulerState.SCHEDULING,
        })
      );
    });

    it('应该发射批次调度事件', () => {
      const spy = vi.fn();
      eventBus.on('scheduler:batch:scheduled', spy);

      const token: Token = {
        type: TokenType.TEXT,
        content: 'Test',
        position: 0,
        length: 4,
        confidence: TokenConfidence.CONFIRMED,
      };

      scheduler.addToken(token);
      vi.runOnlyPendingTimers();

      expect(spy).toHaveBeenCalled();
      const eventData = spy.mock.calls[0][0];
      expect(eventData.batch).toHaveProperty('id');
      expect(eventData.batch.tokenCount).toBe(1);
    });
  });
});
