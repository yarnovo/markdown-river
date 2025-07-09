import { EventBus } from './EventBus.js';
import { ParseEvent, RenderTask } from '../types/index.js';

interface SchedulerOptions {
  batchSize: number;
}

export class RenderScheduler {
  private eventBus: EventBus;
  private options: SchedulerOptions;
  private taskQueue: RenderTask[] = [];
  private pendingEvents: ParseEvent[] = [];
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private destroyed = false;
  private idleCallbackId: number | null = null;
  private highPriorityQueue: RenderTask[] = [];

  constructor(eventBus: EventBus, options: SchedulerOptions) {
    this.eventBus = eventBus;
    this.options = options;
  }

  /**
   * 调度渲染任务
   */
  scheduleRender(events: ParseEvent[]): void {
    if (this.destroyed) return;

    // 累积事件
    this.pendingEvents.push(...events);

    // 如果累积的事件达到批处理大小，创建任务
    if (this.pendingEvents.length >= this.options.batchSize) {
      this.createTask();
    }

    // 请求下一帧
    this.scheduleFrame();
  }

  /**
   * 创建渲染任务
   */
  private createTask(): void {
    if (this.pendingEvents.length === 0) return;

    const task: RenderTask = {
      events: [...this.pendingEvents],
      priority: this.calculatePriority(this.pendingEvents),
      timestamp: Date.now(),
    };

    // 根据优先级添加到不同队列
    if (task.priority > 0.8) {
      this.highPriorityQueue.push(task);
    } else {
      this.taskQueue.push(task);
    }

    // 清空待处理事件
    this.pendingEvents = [];
  }

  /**
   * 计算任务优先级
   */
  private calculatePriority(events: ParseEvent[]): number {
    let priority = 0.5;

    for (const event of events) {
      // 标题和代码块优先级较高
      if (event.elementType === 'heading' || event.elementType === 'code_block') {
        priority = Math.max(priority, 0.9);
      }
      // 文本内容中等优先级
      else if (event.type === 'text') {
        priority = Math.max(priority, 0.7);
      }
      // 修正事件最高优先级
      else if (event.type === 'revision') {
        priority = 1.0;
      }
    }

    return priority;
  }

  /**
   * 调度下一帧
   */
  private scheduleFrame(): void {
    if (this.rafId !== null || this.destroyed) return;

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.processFrame();
    });
  }

  /**
   * 处理一帧
   */
  private processFrame(): void {
    const frameStart = performance.now();
    const frameBudget = 16; // 目标 60fps
    let processed = 0;

    // 先处理高优先级队列
    while (
      this.highPriorityQueue.length > 0 &&
      performance.now() - frameStart < frameBudget * 0.8
    ) {
      const task = this.highPriorityQueue.shift()!;
      this.executeTask(task);
      processed++;
    }

    // 处理普通队列
    while (this.taskQueue.length > 0 && performance.now() - frameStart < frameBudget * 0.8) {
      const task = this.taskQueue.shift()!;
      this.executeTask(task);
      processed++;
    }

    // 处理剩余的待处理事件
    if (this.pendingEvents.length > 0 && performance.now() - frameStart < frameBudget * 0.9) {
      this.createTask();
    }

    // 更新性能指标
    const frameTime = performance.now() - frameStart;
    this.updateMetrics(frameTime, processed);

    // 如果还有任务，继续调度
    if (
      this.taskQueue.length > 0 ||
      this.highPriorityQueue.length > 0 ||
      this.pendingEvents.length > 0
    ) {
      this.scheduleFrame();
    } else {
      // 使用空闲回调处理低优先级任务
      this.scheduleIdleWork();
    }
  }

  /**
   * 执行渲染任务
   */
  private executeTask(task: RenderTask): void {
    // 发送渲染事件
    this.eventBus.emit('scheduler:render', task.events);
  }

  /**
   * 调度空闲工作
   */
  private scheduleIdleWork(): void {
    if (this.idleCallbackId !== null || this.destroyed) return;

    if ('requestIdleCallback' in window) {
      this.idleCallbackId = (window as any).requestIdleCallback((deadline: any) => {
        this.idleCallbackId = null;
        this.processIdleWork(deadline);
      });
    }
  }

  /**
   * 处理空闲工作
   */
  private processIdleWork(deadline: any): void {
    // 在空闲时间处理低优先级任务
    while (deadline.timeRemaining() > 0 && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      this.executeTask(task);
    }

    if (this.taskQueue.length > 0) {
      this.scheduleIdleWork();
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(frameTime: number, taskCount: number): void {
    this.frameCount++;
    this.lastFrameTime = frameTime;

    // 每秒发送一次性能报告
    if (this.frameCount % 60 === 0) {
      this.eventBus.emit('scheduler:metrics', {
        averageFrameTime: frameTime,
        taskCount,
        queueLength: this.taskQueue.length + this.highPriorityQueue.length,
      });
    }
  }

  /**
   * 立即处理所有待处理任务
   */
  flush(): void {
    if (this.destroyed) return;

    // 创建最后的任务
    if (this.pendingEvents.length > 0) {
      this.createTask();
    }

    // 执行所有高优先级任务
    while (this.highPriorityQueue.length > 0) {
      const task = this.highPriorityQueue.shift()!;
      this.executeTask(task);
    }

    // 执行所有普通任务
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      this.executeTask(task);
    }
  }

  /**
   * 销毁调度器
   */
  destroy(): void {
    this.destroyed = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.idleCallbackId !== null) {
      (window as any).cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    this.taskQueue = [];
    this.highPriorityQueue = [];
    this.pendingEvents = [];
  }
}
