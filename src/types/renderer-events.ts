/**
 * 渲染器事件类型定义
 */

import { BaseEventData } from './events.js';

/**
 * 渲染器状态
 */
export enum RendererState {
  IDLE = 'IDLE', // 空闲
  RENDERING = 'RENDERING', // 渲染中
  ENDED = 'ENDED', // 已结束
  ERROR = 'ERROR', // 错误
}

/**
 * 渲染器性能指标
 */
export interface PerformanceMetrics {
  /**
   * 总处理字符数
   */
  totalChars: number;

  /**
   * 渲染延迟（毫秒）
   */
  renderLatency: number;

  /**
   * 吞吐量（字符/秒）
   */
  throughput: number;

  /**
   * 总渲染时间（毫秒）
   */
  totalRenderTime: number;

  /**
   * 解析错误数
   */
  parseErrors: number;

  /**
   * 回溯次数
   */
  backtrackCount: number;
}

/**
 * 渲染器配置选项
 */
export interface RendererOptions {
  /**
   * 容器元素
   */
  container?: HTMLElement;

  /**
   * 样式映射
   */
  styleMap?: Map<string, string>;

  /**
   * 缓冲区大小
   * @default 1024
   */
  bufferSize?: number;

  /**
   * 启用调试模式
   * @default false
   */
  debug?: boolean;

  /**
   * 最小渲染间隔（毫秒）
   * @default 16
   */
  minRenderInterval?: number;

  /**
   * 最大批次大小
   * @default 50
   */
  maxBatchSize?: number;

  /**
   * 启用性能监控
   * @default true
   */
  enableMetrics?: boolean;

  /**
   * 错误处理器
   */
  onError?: (error: Error) => void;
}

/**
 * 渲染开始事件数据
 */
export interface RenderStartEventData extends BaseEventData {
  startTime: number;
}

/**
 * 渲染结束事件数据
 */
export interface RenderEndEventData extends BaseEventData {
  endTime: number;
  totalChars: number;
  duration: number;
  metrics?: PerformanceMetrics;
}

/**
 * 渲染错误事件数据
 */
export interface RenderErrorEventData extends BaseEventData {
  error: Error;
  context?: string;
  position?: number;
}

/**
 * 渲染进度事件数据
 */
export interface RenderProgressEventData extends BaseEventData {
  processedChars: number;
  totalChars?: number;
  progress?: number;
}

/**
 * 渲染器状态变更事件数据
 */
export interface RendererStateChangeEventData extends BaseEventData {
  previousState: RendererState;
  newState: RendererState;
}

/**
 * 渲染器事件映射
 */
export interface RendererEventMap {
  'render:start': RenderStartEventData;
  'render:end': RenderEndEventData;
  'render:error': RenderErrorEventData;
  'render:progress': RenderProgressEventData;
  'render:state:changed': RendererStateChangeEventData;
}
