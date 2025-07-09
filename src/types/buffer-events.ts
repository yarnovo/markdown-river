import { BaseEventData } from './events';

/**
 * 缓冲管理器写入事件数据
 */
export interface BufferWriteEventData extends BaseEventData {
  written: number;
  chunk: string;
}

/**
 * 缓冲管理器读取事件数据
 */
export interface BufferReadEventData extends BaseEventData {
  read: number;
  content: string;
}

/**
 * 缓冲管理器回溯事件数据
 */
export interface BufferBacktrackEventData extends BaseEventData {
  backtracked: number;
}

/**
 * 缓冲管理器清空事件数据
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BufferClearEventData extends BaseEventData {}

/**
 * 缓冲管理器事件数据联合类型
 */
export type BufferManagerEventData =
  | BufferWriteEventData
  | BufferReadEventData
  | BufferBacktrackEventData
  | BufferClearEventData;
