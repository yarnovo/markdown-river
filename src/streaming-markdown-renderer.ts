/**
 * 流式 Markdown 渲染器 - 主入口类
 *
 * 核心功能：
 * 1. 整合所有核心组件，提供统一的 API
 * 2. 管理组件间的协作和数据流
 * 3. 提供简洁的公共接口
 * 4. 处理错误和异常情况
 */

import { EventBus } from './infrastructure/event-bus';
import { BufferManager } from './core/buffer-manager';
import { IncrementalParser } from './core/incremental-parser';
import { RenderScheduler } from './core/render-scheduler';
import { DOMManager } from './infrastructure/dom-manager';
import { StyleProcessor } from './infrastructure/style-processor';
import type { Token } from './types/parser-events';

import {
  RendererOptions,
  RendererState,
  PerformanceMetrics,
  RenderStartEventData,
  RenderEndEventData,
  RenderErrorEventData,
  RenderProgressEventData,
} from './types/renderer-events';

/**
 * 流式 Markdown 渲染器主类
 */
export class StreamingMarkdownRenderer {
  private eventBus: EventBus;
  private bufferManager: BufferManager;
  private parser: IncrementalParser;
  private scheduler: RenderScheduler;
  private domManager: DOMManager;
  private styleProcessor: StyleProcessor;

  private options: Required<RendererOptions>;
  private state: RendererState = RendererState.IDLE;

  // 性能指标
  private startTime: number = 0;
  private totalChars: number = 0;
  private errorCount: number = 0;

  constructor(options: RendererOptions = {}) {
    // 设置默认选项
    this.options = {
      container: options.container || document.createElement('div'),
      styleMap: options.styleMap || new Map(),
      bufferSize: options.bufferSize ?? 1024,
      debug: options.debug ?? false,
      minRenderInterval: options.minRenderInterval ?? 16,
      maxBatchSize: options.maxBatchSize ?? 50,
      enableMetrics: options.enableMetrics ?? true,
      onError: options.onError || ((error: Error) => console.error('Renderer error:', error)),
    };

    // 初始化事件总线
    this.eventBus = new EventBus();

    // 初始化样式处理器
    this.styleProcessor = new StyleProcessor({
      styleMap: this.options.styleMap,
    });

    // 初始化 DOM 管理器
    this.domManager = new DOMManager({
      container: this.options.container,
      eventBus: this.eventBus,
    });

    // 初始化缓冲管理器
    this.bufferManager = new BufferManager({
      bufferSize: this.options.bufferSize,
      eventBus: this.eventBus,
    });

    // 初始化增量解析器
    this.parser = new IncrementalParser({
      bufferManager: this.bufferManager,
      eventBus: this.eventBus,
    });

    // 初始化渲染调度器
    this.scheduler = new RenderScheduler({
      eventBus: this.eventBus,
      domManager: this.domManager,
      minInterval: this.options.minRenderInterval,
      maxBatchSize: this.options.maxBatchSize,
      enableAdaptiveRate: true,
    });

    // 设置事件监听
    this.setupEventListeners();

    // 如果启用调试模式，添加调试监听器
    if (this.options.debug) {
      this.setupDebugListeners();
    }
  }

  /**
   * 写入流式输入
   */
  write(chunk: string): void {
    if (this.state === RendererState.ENDED) {
      this.handleError(new Error('Cannot write after end'));
      return;
    }

    if (this.state === RendererState.IDLE) {
      this.start();
    }

    try {
      // 记录字符数
      this.totalChars += chunk.length;

      // 解析并生成令牌（parse 方法会自动写入缓冲区）
      const tokens = this.parser.parse(chunk);

      // 将令牌发送到调度器
      tokens.forEach(token => {
        this.scheduler.addToken(token);
      });

      // 发送进度事件
      if (this.options.enableMetrics) {
        this.eventBus.emit<RenderProgressEventData>('render:progress', {
          processedChars: this.totalChars,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 结束流式输入
   */
  end(): void {
    if (this.state === RendererState.ENDED) {
      return;
    }

    try {
      // 处理剩余的缓冲区内容
      const finalTokens = this.parser.end();

      // 将最后的令牌发送到调度器
      finalTokens.forEach(token => {
        this.scheduler.addToken(token);
      });

      // 等待调度器完成
      this.waitForSchedulerCompletion(() => {
        this.setState(RendererState.ENDED);

        // 计算最终指标
        const endTime = Date.now();
        const duration = endTime - this.startTime;

        // 发送结束事件
        this.eventBus.emit<RenderEndEventData>('render:end', {
          endTime,
          totalChars: this.totalChars,
          duration,
          metrics: this.getPerformanceMetrics(),
          timestamp: endTime,
        });
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 重置渲染器
   */
  reset(): void {
    // 重置所有组件
    this.scheduler.reset();
    this.parser.reset();
    this.bufferManager.clear();
    this.domManager.clear();

    // 重置状态
    this.state = RendererState.IDLE;
    this.startTime = 0;
    this.totalChars = 0;
    this.errorCount = 0;
  }

  /**
   * 获取当前状态
   */
  getState(): RendererState {
    return this.state;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const totalRenderTime = this.startTime ? now - this.startTime : 0;
    const throughput = totalRenderTime > 0 ? (this.totalChars / totalRenderTime) * 1000 : 0;

    const schedulerStats = this.scheduler.getStats();

    return {
      totalChars: this.totalChars,
      renderLatency: schedulerStats.averageInterval,
      throughput,
      totalRenderTime,
      parseErrors: this.errorCount,
      backtrackCount: 0, // TODO: 从解析器获取回溯计数
    };
  }

  /**
   * 设置样式映射
   */
  setStyleMap(styleMap: Map<string, string>): void {
    this.styleProcessor.setStyles(styleMap);
  }

  /**
   * 获取事件总线（用于扩展）
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 监听渲染器事件
   */
  on(event: string, handler: (data: unknown) => void): void {
    this.eventBus.on(event, handler);
  }

  /**
   * 取消监听渲染器事件
   */
  off(event: string, handler: (data: unknown) => void): void {
    this.eventBus.off(event, handler);
  }

  /**
   * 开始渲染
   */
  private start(): void {
    if (this.state !== RendererState.IDLE) {
      return;
    }

    this.setState(RendererState.RENDERING);
    this.startTime = Date.now();

    // 发送开始事件
    this.eventBus.emit<RenderStartEventData>('render:start', {
      startTime: this.startTime,
      timestamp: this.startTime,
    });
  }

  /**
   * 设置状态
   */
  private setState(newState: RendererState): void {
    if (this.state === newState) return;

    const previousState = this.state;
    this.state = newState;

    this.eventBus.emit('render:state:changed', {
      previousState,
      newState,
      timestamp: Date.now(),
    });
  }

  /**
   * 处理错误
   */
  private handleError(error: Error): void {
    this.errorCount++;
    this.setState(RendererState.ERROR);

    // 发送错误事件
    this.eventBus.emit<RenderErrorEventData>('render:error', {
      error,
      context: 'StreamingMarkdownRenderer',
      position: this.totalChars,
      timestamp: Date.now(),
    });

    // 调用错误处理器
    this.options.onError(error);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听解析器生成的令牌
    this.eventBus.on('parser:token', data => {
      const tokenData = data as { token: unknown };
      this.scheduler.addToken(tokenData.token as Token);
    });

    // 监听解析器错误
    this.eventBus.on('parser:error', data => {
      const errorData = data as { error: Error };
      this.handleError(errorData.error);
    });

    // 应用样式到渲染的元素
    this.eventBus.on('dom:create', data => {
      const createData = data as unknown as { nodeType: string; nodeId: string };
      const style = this.styleProcessor.getStyle(createData.nodeType);
      if (style) {
        this.domManager.setClass(createData.nodeId, style);
      }
    });
  }

  /**
   * 设置调试监听器
   */
  private setupDebugListeners(): void {
    // 打印所有事件
    const events = [
      'buffer:write',
      'buffer:read',
      'parser:token',
      'scheduler:batch:rendered',
      'dom:create',
      'render:progress',
    ];

    events.forEach(event => {
      this.eventBus.on(event, data => {
        console.debug(`[${event}]`, data);
      });
    });
  }

  /**
   * 等待调度器完成
   */
  private waitForSchedulerCompletion(callback: () => void): void {
    const checkCompletion = (): void => {
      const state = this.scheduler.getState();
      const stats = this.scheduler.getStats();

      if (state === 'IDLE' && stats.queueLength === 0) {
        callback();
      } else {
        setTimeout(checkCompletion, 50);
      }
    };

    checkCompletion();
  }
}

// 导出便捷函数
export function createRenderer(options?: RendererOptions): StreamingMarkdownRenderer {
  return new StreamingMarkdownRenderer(options);
}
