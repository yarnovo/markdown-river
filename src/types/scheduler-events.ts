/**
 * 渲染调度器事件类型定义
 */

import { BaseEventData } from './events.js';
import { Token } from './parser-events.js';

/**
 * 调度状态
 */
export enum SchedulerState {
  IDLE = 'IDLE', // 空闲
  SCHEDULING = 'SCHEDULING', // 调度中
  RENDERING = 'RENDERING', // 渲染中
  PAUSED = 'PAUSED', // 暂停
  STOPPED = 'STOPPED', // 停止
}

/**
 * 批次信息
 */
export interface BatchInfo {
  /**
   * 批次ID
   */
  id: string;

  /**
   * 批次中的令牌数量
   */
  tokenCount: number;

  /**
   * 批次大小（字符数）
   */
  size: number;

  /**
   * 创建时间
   */
  createdAt: number;

  /**
   * 调度时间
   */
  scheduledAt?: number;

  /**
   * 渲染时间
   */
  renderedAt?: number;
}

/**
 * 调度器配置
 */
export interface SchedulerOptions {
  /**
   * 最小渲染间隔（毫秒）
   * @default 16 (60fps)
   */
  minInterval?: number;

  /**
   * 最大渲染间隔（毫秒）
   * @default 100
   */
  maxInterval?: number;

  /**
   * 最大批次大小（令牌数）
   * @default 50
   */
  maxBatchSize?: number;

  /**
   * 最大批次缓冲区大小（字符数）
   * @default 500
   */
  maxBatchBufferSize?: number;

  /**
   * 平滑因子（0-1）
   * @default 0.8
   */
  smoothFactor?: number;

  /**
   * 启用自适应速率
   * @default true
   */
  enableAdaptiveRate?: boolean;

  /**
   * 启用批处理
   * @default true
   */
  enableBatching?: boolean;

  /**
   * 目标帧率
   * @default 60
   */
  targetFPS?: number;
}

/**
 * 速率信息
 */
export interface RateInfo {
  /**
   * 当前渲染间隔
   */
  currentInterval: number;

  /**
   * 输入速率（令牌/秒）
   */
  inputRate: number;

  /**
   * 输出速率（令牌/秒）
   */
  outputRate: number;

  /**
   * 队列压力（0-1）
   */
  queuePressure: number;

  /**
   * 建议的渲染间隔
   */
  suggestedInterval: number;
}

/**
 * 调度器统计信息
 */
export interface SchedulerStats {
  /**
   * 总令牌数
   */
  totalTokens: number;

  /**
   * 已渲染令牌数
   */
  renderedTokens: number;

  /**
   * 总批次数
   */
  totalBatches: number;

  /**
   * 平均批次大小
   */
  averageBatchSize: number;

  /**
   * 平均渲染间隔
   */
  averageInterval: number;

  /**
   * 队列长度
   */
  queueLength: number;

  /**
   * 丢弃的令牌数
   */
  droppedTokens: number;
}

/**
 * 批次调度事件数据
 */
export interface BatchScheduledEventData extends BaseEventData {
  batch: BatchInfo;
  queueLength: number;
}

/**
 * 批次渲染事件数据
 */
export interface BatchRenderedEventData extends BaseEventData {
  batch: BatchInfo;
  duration: number;
  tokensRendered: number;
}

/**
 * 速率调整事件数据
 */
export interface RateAdjustedEventData extends BaseEventData {
  previousInterval: number;
  newInterval: number;
  rateInfo: RateInfo;
}

/**
 * 队列溢出事件数据
 */
export interface QueueOverflowEventData extends BaseEventData {
  droppedTokens: Token[];
  queueSize: number;
  maxSize: number;
}

/**
 * 状态变更事件数据
 */
export interface SchedulerStateChangeEventData extends BaseEventData {
  previousState: SchedulerState;
  newState: SchedulerState;
}

/**
 * 调度器事件映射
 */
export interface SchedulerEventMap {
  'scheduler:batch:scheduled': BatchScheduledEventData;
  'scheduler:batch:rendered': BatchRenderedEventData;
  'scheduler:rate:adjusted': RateAdjustedEventData;
  'scheduler:queue:overflow': QueueOverflowEventData;
  'scheduler:state:changed': SchedulerStateChangeEventData;
}
