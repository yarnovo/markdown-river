/**
 * 渲染调度器 - 控制令牌到 DOM 的输出节奏
 *
 * 核心功能：
 * 1. 批量处理令牌，减少 DOM 操作
 * 2. 保持稳定输出速率，避免卡顿
 * 3. 智能调节输出节奏
 * 4. 自适应速率控制
 */

import { EventBus } from '../infrastructure/event-bus';
import { DOMManager } from '../infrastructure/dom-manager';
import { Token, TokenType } from '../types/parser-events';
import {
  SchedulerOptions,
  SchedulerState,
  BatchInfo,
  RateInfo,
  SchedulerStats,
} from '../types/scheduler-events';

/**
 * 批次项
 */
interface BatchItem {
  token: Token;
  timestamp: number;
}

/**
 * 渲染调度器类
 */
export class RenderScheduler {
  private eventBus: EventBus;
  private domManager: DOMManager;
  private options: Required<SchedulerOptions>;
  private state: SchedulerState = SchedulerState.IDLE;

  // 令牌队列
  private tokenQueue: BatchItem[] = [];
  private currentBatch: BatchItem[] = [];

  // 计时器
  private scheduleTimer?: number;
  private lastRenderTime: number = 0;
  private renderCount: number = 0;

  // 速率控制
  private currentInterval: number;
  private inputTimestamps: number[] = [];
  private outputTimestamps: number[] = [];

  // 统计信息
  private stats: SchedulerStats = {
    totalTokens: 0,
    renderedTokens: 0,
    totalBatches: 0,
    averageBatchSize: 0,
    averageInterval: 0,
    queueLength: 0,
    droppedTokens: 0,
  };

  // 批次计数器
  private batchIdCounter = 0;

  // 内容根节点ID
  private contentRootId: string = 'content';

  constructor(
    options: SchedulerOptions & {
      eventBus?: EventBus;
      domManager?: DOMManager;
      container?: HTMLElement;
    } = {}
  ) {
    this.eventBus = options.eventBus || new EventBus();

    // 如果没有提供domManager，创建一个新的
    if (!options.domManager) {
      const container = options.container || document.createElement('div');
      this.domManager = new DOMManager({
        container,
        eventBus: this.eventBus,
      });
    } else {
      this.domManager = options.domManager;
    }

    this.options = {
      minInterval: options.minInterval ?? 16,
      maxInterval: options.maxInterval ?? 100,
      maxBatchSize: options.maxBatchSize ?? 50,
      maxBatchBufferSize: options.maxBatchBufferSize ?? 500,
      smoothFactor: options.smoothFactor ?? 0.8,
      enableAdaptiveRate: options.enableAdaptiveRate ?? true,
      enableBatching: options.enableBatching ?? true,
      targetFPS: options.targetFPS ?? 60,
    };

    this.currentInterval = this.options.minInterval;

    // 创建内容根节点
    this.contentRootId = this.domManager.createElement({
      tag: 'div',
      attributes: { id: 'content' },
    });

    // 立即执行创建操作，避免影响后续测试
    this.domManager.flush();
  }

  /**
   * 添加令牌到调度队列
   */
  addToken(token: Token): void {
    const now = Date.now();

    // 记录输入时间戳
    this.inputTimestamps.push(now);
    this.cleanOldTimestamps();

    // 添加到队列
    this.tokenQueue.push({ token, timestamp: now });
    this.stats.totalTokens++;
    this.stats.queueLength = this.tokenQueue.length;

    // 检查队列溢出
    if (this.tokenQueue.length > this.options.maxBatchSize * 10) {
      this.handleQueueOverflow();
    }

    // 开始调度
    if (this.state === SchedulerState.IDLE) {
      this.start();
    }
  }

  /**
   * 批量添加令牌
   */
  addTokens(tokens: Token[]): void {
    tokens.forEach(token => this.addToken(token));
  }

  /**
   * 开始调度
   */
  start(): void {
    if (this.state === SchedulerState.STOPPED) {
      return;
    }

    this.setState(SchedulerState.SCHEDULING);
    this.scheduleNextBatch();
  }

  /**
   * 暂停调度
   */
  pause(): void {
    if (this.state === SchedulerState.SCHEDULING || this.state === SchedulerState.RENDERING) {
      this.setState(SchedulerState.PAUSED);
      this.cancelSchedule();
    }
  }

  /**
   * 恢复调度
   */
  resume(): void {
    if (this.state === SchedulerState.PAUSED) {
      this.setState(SchedulerState.SCHEDULING);
      this.scheduleNextBatch();
    }
  }

  /**
   * 停止调度
   */
  stop(): void {
    this.setState(SchedulerState.STOPPED);
    this.cancelSchedule();
    this.clearQueues();
  }

  /**
   * 重置调度器
   */
  reset(): void {
    this.stop();
    this.state = SchedulerState.IDLE;
    this.stats = {
      totalTokens: 0,
      renderedTokens: 0,
      totalBatches: 0,
      averageBatchSize: 0,
      averageInterval: 0,
      queueLength: 0,
      droppedTokens: 0,
    };
    this.inputTimestamps = [];
    this.outputTimestamps = [];
    this.renderCount = 0;
    this.lastRenderTime = 0;
    this.currentInterval = this.options.minInterval;
  }

  /**
   * 调度下一批次
   */
  private scheduleNextBatch(): void {
    if (this.state !== SchedulerState.SCHEDULING) {
      return;
    }

    // 计算下次调度时间
    const now = Date.now();
    const timeSinceLastRender = now - this.lastRenderTime;
    const delay = Math.max(0, this.currentInterval - timeSinceLastRender);

    this.scheduleTimer = window.setTimeout(() => {
      this.processBatch();
    }, delay);
  }

  /**
   * 处理批次
   */
  private processBatch(): void {
    if (this.state !== SchedulerState.SCHEDULING) {
      return;
    }

    this.setState(SchedulerState.RENDERING);
    const startTime = Date.now();

    // 准备批次
    const batch = this.prepareBatch();
    if (batch.length === 0) {
      this.setState(SchedulerState.IDLE);
      return;
    }

    // 创建批次信息
    const batchInfo: BatchInfo = {
      id: `batch-${++this.batchIdCounter}`,
      tokenCount: batch.length,
      size: batch.reduce((sum, item) => sum + item.token.content.length, 0),
      createdAt: startTime,
      scheduledAt: startTime,
    };

    // 发射批次调度事件
    this.eventBus.emit('scheduler:batch:scheduled', {
      batch: batchInfo,
      queueLength: this.tokenQueue.length,
      timestamp: startTime,
    });

    // 渲染批次
    this.renderBatch(batch);

    // 记录渲染完成
    const endTime = Date.now();
    const duration = endTime - startTime;
    batchInfo.renderedAt = endTime;

    // 更新统计信息
    this.updateStats(batch.length, duration);

    // 发射批次渲染完成事件
    this.eventBus.emit('scheduler:batch:rendered', {
      batch: batchInfo,
      duration,
      tokensRendered: batch.length,
      timestamp: endTime,
    });

    // 调整速率
    if (this.options.enableAdaptiveRate) {
      this.adjustRate();
    }

    // 继续调度
    this.lastRenderTime = endTime;
    this.setState(SchedulerState.SCHEDULING);

    if (this.tokenQueue.length > 0) {
      this.scheduleNextBatch();
    } else {
      this.setState(SchedulerState.IDLE);
    }
  }

  /**
   * 准备批次
   */
  private prepareBatch(): BatchItem[] {
    if (!this.options.enableBatching) {
      // 不启用批处理，每次只处理一个令牌
      return this.tokenQueue.splice(0, 1);
    }

    const batch: BatchItem[] = [];
    let batchSize = 0;
    const maxSize = this.options.maxBatchSize;
    const maxBufferSize = this.options.maxBatchBufferSize;

    while (this.tokenQueue.length > 0 && batch.length < maxSize) {
      const item = this.tokenQueue[0];
      const tokenSize = item.token.content.length;

      // 检查批次缓冲区大小
      if (batchSize + tokenSize > maxBufferSize && batch.length > 0) {
        break;
      }

      batch.push(this.tokenQueue.shift()!);
      batchSize += tokenSize;
    }

    return batch;
  }

  /**
   * 渲染批次
   */
  private renderBatch(batch: BatchItem[]): void {
    const now = Date.now();

    batch.forEach(item => {
      this.renderToken(item.token);
      this.outputTimestamps.push(now);
    });

    this.cleanOldTimestamps();
  }

  /**
   * 渲染单个令牌
   */
  private renderToken(token: Token): void {
    // 根据令牌类型创建相应的 DOM 节点
    switch (token.type) {
      case TokenType.TEXT:
      case TokenType.WHITESPACE: {
        // 创建一个 span 节点来包含文本
        const textNodeId = this.domManager.createElement({
          tag: 'span',
          text: token.content,
        });
        this.domManager.appendChild(this.contentRootId, textNodeId);
        break;
      }

      case TokenType.NEWLINE: {
        const brNodeId = this.domManager.createElement({ tag: 'br' });
        this.domManager.appendChild(this.contentRootId, brNodeId);
        break;
      }

      case TokenType.PARAGRAPH_START:
        this.domManager.createElement({
          tag: 'p',
          attributes: { id: 'current-paragraph' },
        });
        break;

      case TokenType.PARAGRAPH_END:
        // 段落结束，不需要特殊处理
        break;

      case TokenType.EMPHASIS_START:
        this.domManager.createElement({
          tag: 'em',
          attributes: { id: 'current-emphasis' },
        });
        break;

      case TokenType.EMPHASIS_END:
        // 强调结束，不需要特殊处理
        break;

      case TokenType.STRONG_START:
        this.domManager.createElement({
          tag: 'strong',
          attributes: { id: 'current-strong' },
        });
        break;

      case TokenType.STRONG_END:
        // 加粗结束，不需要特殊处理
        break;

      case TokenType.CODE_START:
        this.domManager.createElement({
          tag: 'code',
          attributes: { id: 'current-code' },
        });
        break;

      case TokenType.CODE_END:
        // 代码结束，不需要特殊处理
        break;

      case TokenType.HEADING_START: {
        const level = token.metadata?.level || 1;
        this.domManager.createElement({
          tag: `h${level}`,
          attributes: { id: 'current-heading' },
        });
        break;
      }

      case TokenType.HEADING_END:
        // 标题结束，不需要特殊处理
        break;

      // 可能性令牌暂时作为文本处理
      case TokenType.POTENTIAL_EMPHASIS:
      case TokenType.POTENTIAL_STRONG:
      case TokenType.POTENTIAL_CODE:
      case TokenType.POTENTIAL_HEADING: {
        const potentialNodeId = this.domManager.createElement({
          tag: 'span',
          text: token.content,
        });
        this.domManager.appendChild(this.contentRootId, potentialNodeId);
        break;
      }

      default: {
        // 其他令牌类型暂时忽略或作为文本处理
        if (token.content) {
          const defaultNodeId = this.domManager.createElement({
            tag: 'span',
            text: token.content,
          });
          this.domManager.appendChild(this.contentRootId, defaultNodeId);
        }
      }
    }

    this.stats.renderedTokens++;
  }

  /**
   * 调整渲染速率
   */
  private adjustRate(): void {
    const rateInfo = this.calculateRateInfo();
    const previousInterval = this.currentInterval;

    // 使用平滑因子调整间隔
    const targetInterval = rateInfo.suggestedInterval;
    this.currentInterval = Math.round(
      this.currentInterval * this.options.smoothFactor +
        targetInterval * (1 - this.options.smoothFactor)
    );

    // 限制在最小和最大间隔之间
    this.currentInterval = Math.max(
      this.options.minInterval,
      Math.min(this.options.maxInterval, this.currentInterval)
    );

    // 如果间隔变化较大，发射事件
    if (Math.abs(this.currentInterval - previousInterval) > 1) {
      this.eventBus.emit('scheduler:rate:adjusted', {
        previousInterval,
        newInterval: this.currentInterval,
        rateInfo,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 计算速率信息
   */
  private calculateRateInfo(): RateInfo {
    const now = Date.now();
    const timeWindow = 1000; // 1秒时间窗口

    // 计算输入速率
    const recentInputs = this.inputTimestamps.filter(t => now - t < timeWindow);
    const inputRate = recentInputs.length;

    // 计算输出速率
    const recentOutputs = this.outputTimestamps.filter(t => now - t < timeWindow);
    const outputRate = recentOutputs.length;

    // 计算队列压力
    const queuePressure = Math.min(1, this.tokenQueue.length / (this.options.maxBatchSize * 5));

    // 计算建议的间隔
    let suggestedInterval = this.currentInterval;

    if (queuePressure > 0.7) {
      // 队列压力大，加快输出
      suggestedInterval = this.options.minInterval;
    } else if (queuePressure < 0.3 && inputRate < outputRate) {
      // 队列压力小且输入慢于输出，放慢输出
      suggestedInterval = Math.min(this.options.maxInterval, this.currentInterval * 1.1);
    } else {
      // 保持当前速率或略微调整
      const targetFPSInterval = 1000 / this.options.targetFPS;
      suggestedInterval = targetFPSInterval;
    }

    return {
      currentInterval: this.currentInterval,
      inputRate,
      outputRate,
      queuePressure,
      suggestedInterval,
    };
  }

  /**
   * 处理队列溢出
   */
  private handleQueueOverflow(): void {
    const maxQueueSize = this.options.maxBatchSize * 10;
    const overflow = this.tokenQueue.length - maxQueueSize;

    if (overflow > 0) {
      // 丢弃最旧的令牌
      const dropped = this.tokenQueue.splice(0, overflow);
      this.stats.droppedTokens += dropped.length;

      this.eventBus.emit('scheduler:queue:overflow', {
        droppedTokens: dropped.map(item => item.token),
        queueSize: this.tokenQueue.length + overflow,
        maxSize: maxQueueSize,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 清理旧时间戳
   */
  private cleanOldTimestamps(): void {
    const now = Date.now();
    const timeWindow = 2000; // 保留2秒内的时间戳

    this.inputTimestamps = this.inputTimestamps.filter(t => now - t < timeWindow);
    this.outputTimestamps = this.outputTimestamps.filter(t => now - t < timeWindow);
  }

  /**
   * 更新统计信息
   */
  private updateStats(tokensRendered: number, duration: number): void {
    this.renderCount++;
    this.stats.totalBatches++;
    this.stats.queueLength = this.tokenQueue.length;

    // 更新平均批次大小
    const prevAvg = this.stats.averageBatchSize;
    this.stats.averageBatchSize =
      (prevAvg * (this.renderCount - 1) + tokensRendered) / this.renderCount;

    // 更新平均渲染间隔
    const prevInterval = this.stats.averageInterval;
    this.stats.averageInterval =
      (prevInterval * (this.renderCount - 1) + duration) / this.renderCount;
  }

  /**
   * 设置状态
   */
  private setState(newState: SchedulerState): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;

    this.eventBus.emit('scheduler:state:changed', {
      previousState,
      newState,
      timestamp: Date.now(),
    });
  }

  /**
   * 取消调度
   */
  private cancelSchedule(): void {
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = undefined;
    }
  }

  /**
   * 清空队列
   */
  private clearQueues(): void {
    this.tokenQueue = [];
    this.currentBatch = [];
    this.stats.queueLength = 0;
  }

  /**
   * 获取当前状态
   */
  getState(): SchedulerState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getStats(): Readonly<SchedulerStats> {
    return { ...this.stats };
  }

  /**
   * 获取速率信息
   */
  getRateInfo(): RateInfo {
    return this.calculateRateInfo();
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取DOM管理器
   */
  getDOMManager(): DOMManager {
    return this.domManager;
  }
}
