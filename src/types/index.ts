// 渲染器配置选项
export interface RendererOptions {
  // 缓冲区超时时间（毫秒），默认 50ms
  bufferTimeout?: number;
  // 每批渲染的最大事件数，默认 10
  renderBatchSize?: number;
  // 是否启用性能监控，默认 true
  enableMetrics?: boolean;
  // 是否启用语法高亮，默认 true
  syntaxHighlight?: boolean;
  // 是否启用虚拟滚动，默认 false
  virtualScroll?: boolean;
}

// 解析事件类型
export enum ParseEventType {
  TEXT = 'text',
  OPEN_TAG = 'open_tag',
  CLOSE_TAG = 'close_tag',
  SELF_CLOSING_TAG = 'self_closing_tag',
  ATTRIBUTE = 'attribute',
  REVISION = 'revision',
}

// Markdown 元素类型
export enum MarkdownElementType {
  // 块级元素
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  BLOCKQUOTE = 'blockquote',
  CODE_BLOCK = 'code_block',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  HORIZONTAL_RULE = 'horizontal_rule',

  // 行内元素
  TEXT = 'text',
  STRONG = 'strong',
  EMPHASIS = 'emphasis',
  CODE = 'code',
  LINK = 'link',
  IMAGE = 'image',
  STRIKETHROUGH = 'strikethrough',

  // 特殊
  LINE_BREAK = 'line_break',
}

// 解析事件
export interface ParseEvent {
  type: ParseEventType;
  elementType?: MarkdownElementType;
  content?: string;
  attributes?: Record<string, any>;
  startOffset: number;
  endOffset: number;
  // 用于修正的标记
  isTemporary?: boolean;
  revisionOf?: number; // 修正的事件 ID
}

// 解析器状态
export interface ParserState {
  mode: 'normal' | 'code_block' | 'inline_code' | 'link' | 'emphasis';
  buffer: string;
  position: number;
  lineNumber: number;
  columnNumber: number;
  stack: MarkdownElementType[];
  pendingElements: Map<number, PendingElement>;
}

// 待定元素（用于处理歧义）
export interface PendingElement {
  startOffset: number;
  possibleTypes: MarkdownElementType[];
  confidence: Map<MarkdownElementType, number>;
  context: string;
  deadline: number; // 超时时间戳
}

// 性能指标
export interface PerformanceMetrics {
  parseTime: number;
  renderTime: number;
  totalEvents: number;
  revisionCount: number;
  frameTime: number;
  bufferSize: number;
}

// 事件处理器类型
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

// 渲染任务
export interface RenderTask {
  events: ParseEvent[];
  priority: number;
  timestamp: number;
}
