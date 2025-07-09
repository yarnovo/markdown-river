/**
 * V2 架构的事件类型定义
 */

import { Token } from '../core/optimistic-parser.js';
import { DOMSnapshot, DOMOperation } from '../core/dom-diff.js';

/**
 * 解析器令牌事件
 */
export interface ParserTokenEvent {
  token: Token;
  timestamp: number;
}

/**
 * 快照更新事件
 */
export interface SnapshotUpdatedEvent {
  snapshot: DOMSnapshot;
  version: number;
  timestamp: number;
}

/**
 * 解析器结束事件
 */
export interface ParserEndEvent {
  timestamp: number;
}

/**
 * DOM 操作事件
 */
export interface DOMOperationsEvent {
  operations: DOMOperation[];
  version: number;
  timestamp: number;
}

/**
 * V2 事件映射
 */
export interface V2EventMap {
  'parser:token': ParserTokenEvent;
  'snapshot:updated': SnapshotUpdatedEvent;
  'parser:end': ParserEndEvent;
  'dom:operations': DOMOperationsEvent;
}

/**
 * V2 事件类型
 */
export type V2EventType = keyof V2EventMap;

/**
 * V2 事件数据
 */
export type V2EventData<T extends V2EventType> = V2EventMap[T];
