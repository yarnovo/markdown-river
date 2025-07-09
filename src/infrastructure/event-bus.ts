import {
  EventType,
  EventData,
  EventHandler,
  EventListenerOptions,
  IEventBus,
} from '../types/events.js';

/**
 * 内部监听器描述符
 */
interface ListenerDescriptor {
  handler: EventHandler;
  options: EventListenerOptions;
  id: string;
}

/**
 * 事件总线实现
 *
 * 提供模块间通信能力，支持：
 * - 事件监听和触发
 * - 优先级处理
 * - 一次性监听
 * - 条件过滤
 * - 异步事件处理
 */
export class EventBus implements IEventBus {
  private listeners = new Map<string, ListenerDescriptor[]>();
  private nextId = 0;

  /**
   * 监听事件
   */
  on<T extends EventData = EventData>(
    eventType: EventType | string,
    handler: EventHandler<T>,
    options: EventListenerOptions = {}
  ): void {
    const eventKey = eventType.toString();

    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, []);
    }

    const descriptor: ListenerDescriptor = {
      handler: handler as EventHandler,
      options: {
        once: false,
        priority: 0,
        ...options,
      },
      id: this.generateId(),
    };

    const listeners = this.listeners.get(eventKey)!;
    listeners.push(descriptor);

    // 按优先级排序（优先级高的在前）
    listeners.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
  }

  /**
   * 监听一次事件
   */
  once<T extends EventData = EventData>(
    eventType: EventType | string,
    handler: EventHandler<T>
  ): void {
    this.on(eventType, handler, { once: true });
  }

  /**
   * 取消监听
   */
  off<T extends EventData = EventData>(
    eventType: EventType | string,
    handler: EventHandler<T>
  ): void {
    const eventKey = eventType.toString();
    const listeners = this.listeners.get(eventKey);

    if (!listeners) {
      return;
    }

    const index = listeners.findIndex(descriptor => descriptor.handler === handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    // 如果没有监听器了，删除这个事件类型
    if (listeners.length === 0) {
      this.listeners.delete(eventKey);
    }
  }

  /**
   * 触发事件
   */
  async emit<T extends EventData = EventData>(
    eventType: EventType | string,
    data: T
  ): Promise<void> {
    const eventKey = eventType.toString();
    const listeners = this.listeners.get(eventKey);

    if (!listeners || listeners.length === 0) {
      return;
    }

    // 确保事件数据包含时间戳
    const eventData = {
      ...data,
      timestamp: data.timestamp || Date.now(),
    } as T;

    // 需要移除的一次性监听器
    const toRemove: string[] = [];

    // 按优先级顺序执行监听器
    for (const descriptor of listeners) {
      try {
        // 应用过滤条件
        if (descriptor.options.filter && !descriptor.options.filter(eventData)) {
          continue;
        }

        // 执行处理器
        const result = descriptor.handler(eventData);
        if (result instanceof Promise) {
          await result;
        }

        // 标记一次性监听器待移除
        if (descriptor.options.once) {
          toRemove.push(descriptor.id);
        }
      } catch (error) {
        // 监听器执行错误，记录但不中断其他监听器
        console.error(`Event handler error for ${eventKey}:`, error);
      }
    }

    // 移除一次性监听器
    if (toRemove.length > 0) {
      const filteredListeners = listeners.filter(descriptor => !toRemove.includes(descriptor.id));

      if (filteredListeners.length === 0) {
        this.listeners.delete(eventKey);
      } else {
        this.listeners.set(eventKey, filteredListeners);
      }
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 获取监听器数量
   */
  getListenerCount(eventType?: EventType | string): number {
    if (eventType) {
      const listeners = this.listeners.get(eventType.toString());
      return listeners ? listeners.length : 0;
    }

    // 返回所有监听器总数
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `listener_${++this.nextId}_${Date.now()}`;
  }
}

/**
 * 默认的全局事件总线实例
 */
export const eventBus = new EventBus();
