import type { EventHandler } from '../types/index.js';

interface EventListener {
  handler: EventHandler;
  priority: number;
}

export class EventBus {
  private events: Map<string, EventListener[]> = new Map();
  private eventQueue: Array<{ event: string; data: any }> = [];
  private processing = false;

  /**
   * 监听事件
   */
  on(event: string, handler: EventHandler, priority = 0): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event)!;
    listeners.push({ handler, priority });

    // 按优先级排序（高优先级在前）
    listeners.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 取消监听事件
   */
  off(event: string, handler: EventHandler): void {
    const listeners = this.events.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(l => l.handler === handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, data?: any): void {
    // 添加到队列
    this.eventQueue.push({ event, data });

    // 如果没有在处理，开始处理队列
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * 同步触发事件（立即执行，不进入队列）
   */
  emitSync(event: string, data?: any): void {
    const listeners = this.events.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener.handler(data);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }
  }

  /**
   * 处理事件队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift()!;
      const listeners = this.events.get(event);

      if (listeners) {
        for (const listener of listeners) {
          try {
            const result = listener.handler(data);
            if (result instanceof Promise) {
              await result;
            }
          } catch (error) {
            console.error(`Error in event handler for "${event}":`, error);
          }
        }
      }
    }

    this.processing = false;
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * 获取监听器数量
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  /**
   * 一次性监听事件
   */
  once(event: string, handler: EventHandler, priority = 0): void {
    const onceHandler: EventHandler = data => {
      this.off(event, onceHandler);
      return handler(data);
    };
    this.on(event, onceHandler, priority);
  }
}
