import { EventBus } from '../modules/EventBus.js';
import { InputBuffer } from '../modules/InputBuffer.js';
import { IncrementalParser } from '../modules/IncrementalParser.js';
import { StreamRenderer } from '../modules/StreamRenderer.js';
import { RenderScheduler } from '../modules/RenderScheduler.js';
import { PerformanceMonitor } from '../modules/PerformanceMonitor.js';
import type { RendererOptions, ParseEvent, PerformanceMetrics } from '../types/index.js';

export class StreamingMarkdownRenderer {
  private _container: HTMLElement;
  private options: Required<RendererOptions>;
  private eventBus: EventBus;
  private inputBuffer: InputBuffer;
  private parser: IncrementalParser;
  private renderer: StreamRenderer;
  private scheduler: RenderScheduler;
  private monitor?: PerformanceMonitor;
  private destroyed = false;

  constructor(container: HTMLElement, options: RendererOptions = {}) {
    this._container = container;
    this.options = {
      bufferTimeout: options.bufferTimeout ?? 50,
      renderBatchSize: options.renderBatchSize ?? 10,
      enableMetrics: options.enableMetrics ?? true,
      syntaxHighlight: options.syntaxHighlight ?? true,
      virtualScroll: options.virtualScroll ?? false,
    };

    // 初始化事件总线
    this.eventBus = new EventBus();

    // 初始化性能监控
    if (this.options.enableMetrics) {
      this.monitor = new PerformanceMonitor(this.eventBus);
    }

    // 初始化各个模块
    this.inputBuffer = new InputBuffer(this.eventBus, {
      timeout: this.options.bufferTimeout,
    });

    this.parser = new IncrementalParser(this.eventBus);

    this.renderer = new StreamRenderer(container, this.eventBus, {
      syntaxHighlight: this.options.syntaxHighlight,
      virtualScroll: this.options.virtualScroll,
    });

    this.scheduler = new RenderScheduler(this.eventBus, {
      batchSize: this.options.renderBatchSize,
    });

    // 设置事件流
    this.setupEventFlow();
  }

  private setupEventFlow(): void {
    // 缓冲区 -> 解析器
    this.eventBus.on('buffer:flush', (data: { content: string }) => {
      if (!this.destroyed) {
        this.parser.parse(data.content);
      }
    });

    // 解析器 -> 调度器
    this.eventBus.on('parser:event', (event: ParseEvent) => {
      if (!this.destroyed) {
        this.scheduler.scheduleRender([event]);
      }
    });

    // 调度器 -> 渲染器
    this.eventBus.on('scheduler:render', (events: ParseEvent[]) => {
      if (!this.destroyed) {
        this.renderer.render(events);
      }
    });
  }

  /**
   * 写入文本块
   */
  write(chunk: string): void {
    if (this.destroyed) {
      throw new Error('Renderer has been destroyed');
    }
    this.inputBuffer.write(chunk);
  }

  /**
   * 结束输入流
   */
  end(): void {
    if (this.destroyed) return;

    this.inputBuffer.flush();
    this.parser.end();
    this.scheduler.flush();
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.inputBuffer.destroy();
    this.parser.destroy();
    this.renderer.destroy();
    this.scheduler.destroy();
    this.monitor?.destroy();
    this.eventBus.removeAllListeners();
  }

  /**
   * 监听事件
   */
  on(event: string, handler: (data: unknown) => void): void {
    this.eventBus.on(event, handler);
  }

  /**
   * 取消监听事件
   */
  off(event: string, handler: (data: unknown) => void): void {
    this.eventBus.off(event, handler);
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics | undefined {
    return this.monitor?.getMetrics();
  }
}
