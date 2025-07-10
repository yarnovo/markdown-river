/**
 * 新架构的事件类型定义
 */

/**
 * 内容解析事件
 */
export interface ContentParsedEvent {
  html: string; // 全量 HTML
  timestamp: number; // 时间戳
  chunkIndex: number; // 第几次解析
}

/**
 * 事件映射
 */
export interface MarkdownRiverEventMap {
  'content:parsed': ContentParsedEvent;
}

/**
 * 事件类型
 */
export type EventType = keyof MarkdownRiverEventMap;

/**
 * 事件数据
 */
export type EventData<T extends EventType> = MarkdownRiverEventMap[T];
