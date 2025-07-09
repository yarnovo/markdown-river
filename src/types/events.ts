/**
 * 事件类型定义
 */
export enum EventType {
  // 解析事件
  PARSE_START = 'parse:start',
  PARSE_TOKEN = 'parse:token',
  PARSE_ERROR = 'parse:error',
  PARSE_END = 'parse:end',

  // 渲染事件
  RENDER_START = 'render:start',
  RENDER_BATCH = 'render:batch',
  RENDER_ERROR = 'render:error',
  RENDER_END = 'render:end',

  // 缓冲事件
  BUFFER_FULL = 'buffer:full',
  BUFFER_OVERFLOW = 'buffer:overflow',
  BUFFER_CLEAR = 'buffer:clear',

  // 性能事件
  PERF_METRIC = 'perf:metric',
  PERF_WARNING = 'perf:warning',

  // 系统事件
  SYSTEM_READY = 'system:ready',
  SYSTEM_ERROR = 'system:error',
  SYSTEM_RESET = 'system:reset',
}

/**
 * 事件数据基础接口
 */
export interface BaseEventData {
  timestamp: number;
  source?: string;
}

/**
 * 解析事件数据
 */
export interface ParseEventData extends BaseEventData {
  content?: string;
  position?: number;
  token?: unknown;
  error?: Error;
}

/**
 * 渲染事件数据
 */
export interface RenderEventData extends BaseEventData {
  tokens?: unknown[];
  elementCount?: number;
  duration?: number;
  error?: Error;
}

/**
 * 缓冲事件数据
 */
export interface BufferEventData extends BaseEventData {
  size: number;
  capacity: number;
  utilization: number;
}

/**
 * 性能事件数据
 */
export interface PerformanceEventData extends BaseEventData {
  metric: string;
  value: number;
  unit: string;
  threshold?: number;
}

/**
 * 系统事件数据
 */
export interface SystemEventData extends BaseEventData {
  message: string;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * 事件数据联合类型
 */
export type EventData =
  | ParseEventData
  | RenderEventData
  | BufferEventData
  | PerformanceEventData
  | SystemEventData;

/**
 * 事件处理器函数类型
 */
export type EventHandler<T extends EventData = EventData> = (data: T) => void | Promise<void>;

/**
 * 事件监听器配置
 */
export interface EventListenerOptions {
  /** 是否只监听一次 */
  once?: boolean;
  /** 优先级，数字越大优先级越高 */
  priority?: number;
  /** 过滤条件 */
  filter?: (data: EventData) => boolean;
}

/**
 * 事件总线接口
 */
export interface IEventBus {
  /**
   * 监听事件
   */
  on<T extends EventData = EventData>(
    eventType: EventType | string,
    handler: EventHandler<T>,
    options?: EventListenerOptions
  ): void;

  /**
   * 监听一次事件
   */
  once<T extends EventData = EventData>(
    eventType: EventType | string,
    handler: EventHandler<T>
  ): void;

  /**
   * 取消监听
   */
  off<T extends EventData = EventData>(
    eventType: EventType | string,
    handler: EventHandler<T>
  ): void;

  /**
   * 触发事件
   */
  emit<T extends EventData = EventData>(eventType: EventType | string, data: T): Promise<void>;

  /**
   * 清除所有监听器
   */
  clear(): void;

  /**
   * 获取监听器数量
   */
  getListenerCount(eventType?: EventType | string): number;

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[];
}
