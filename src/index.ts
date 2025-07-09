/**
 * Markdown River - 流式 Markdown 渲染器
 *
 * 一个专门解决 AI 聊天应用中 Markdown 流式渲染闪烁问题的前端库
 */

// 主渲染器
export { StreamingMarkdownRenderer, createRenderer } from './streaming-markdown-renderer';

// 类型定义
export type {
  RendererOptions,
  RendererState,
  PerformanceMetrics,
  RenderStartEventData,
  RenderEndEventData,
  RenderErrorEventData,
  RenderProgressEventData,
  RendererStateChangeEventData,
  RendererEventMap,
} from './types/renderer-events';

// 样式处理器（用于高级用法）
export { StyleProcessor } from './infrastructure/style-processor';

// 事件总线（用于扩展）
export { EventBus } from './infrastructure/event-bus';

// 版本信息
export const VERSION = '0.1.0';
export const AUTHOR = 'Markdown River Contributors';
export const LICENSE = 'MIT';
