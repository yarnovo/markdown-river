// 核心类
export { MarkdownRiver } from './core/MarkdownRiver';

// 策略
export { StandardStrategy } from './strategies';
export type { ParseStrategy } from './strategies';

// React Hook
export { useMarkdownRiver } from './react/useMarkdownRiver';

// 类型
export type { StreamState, MarkdownRiverOptions, ParsedContent, BufferStatus } from './types';

// 事件类型
export type { EventMap } from './events/types';
