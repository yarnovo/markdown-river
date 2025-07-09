/**
 * 增量解析器事件类型定义
 */

import { BaseEventData } from './events.js';

/**
 * 令牌类型枚举
 */
export enum TokenType {
  // 文本类
  TEXT = 'TEXT',
  WHITESPACE = 'WHITESPACE',
  NEWLINE = 'NEWLINE',

  // 可能性令牌（未确认）
  POTENTIAL_EMPHASIS = 'POTENTIAL_EMPHASIS', // 可能的强调（* 或 _）
  POTENTIAL_STRONG = 'POTENTIAL_STRONG', // 可能的加粗（** 或 __）
  POTENTIAL_CODE = 'POTENTIAL_CODE', // 可能的行内代码（`）
  POTENTIAL_LINK_START = 'POTENTIAL_LINK_START', // 可能的链接开始（[）
  POTENTIAL_IMAGE_START = 'POTENTIAL_IMAGE_START', // 可能的图片开始（![）
  POTENTIAL_HEADING = 'POTENTIAL_HEADING', // 可能的标题（#）
  POTENTIAL_LIST_ITEM = 'POTENTIAL_LIST_ITEM', // 可能的列表项（- * + 或数字）
  POTENTIAL_BLOCKQUOTE = 'POTENTIAL_BLOCKQUOTE', // 可能的引用（>）
  POTENTIAL_CODE_BLOCK = 'POTENTIAL_CODE_BLOCK', // 可能的代码块（```）
  POTENTIAL_HORIZONTAL_RULE = 'POTENTIAL_HORIZONTAL_RULE', // 可能的分隔线（--- *** ___）

  // 确认的令牌
  EMPHASIS_START = 'EMPHASIS_START', // 斜体开始
  EMPHASIS_END = 'EMPHASIS_END', // 斜体结束
  STRONG_START = 'STRONG_START', // 加粗开始
  STRONG_END = 'STRONG_END', // 加粗结束
  CODE_START = 'CODE_START', // 行内代码开始
  CODE_END = 'CODE_END', // 行内代码结束
  LINK_START = 'LINK_START', // 链接开始
  LINK_TEXT_END = 'LINK_TEXT_END', // 链接文本结束
  LINK_URL_START = 'LINK_URL_START', // 链接URL开始
  LINK_END = 'LINK_END', // 链接结束
  IMAGE_START = 'IMAGE_START', // 图片开始
  IMAGE_ALT_END = 'IMAGE_ALT_END', // 图片描述结束
  IMAGE_URL_START = 'IMAGE_URL_START', // 图片URL开始
  IMAGE_END = 'IMAGE_END', // 图片结束
  HEADING_START = 'HEADING_START', // 标题开始
  HEADING_END = 'HEADING_END', // 标题结束
  LIST_ITEM_START = 'LIST_ITEM_START', // 列表项开始
  LIST_ITEM_END = 'LIST_ITEM_END', // 列表项结束
  BLOCKQUOTE_START = 'BLOCKQUOTE_START', // 引用开始
  BLOCKQUOTE_END = 'BLOCKQUOTE_END', // 引用结束
  CODE_BLOCK_START = 'CODE_BLOCK_START', // 代码块开始
  CODE_BLOCK_END = 'CODE_BLOCK_END', // 代码块结束
  HORIZONTAL_RULE = 'HORIZONTAL_RULE', // 分隔线
  PARAGRAPH_START = 'PARAGRAPH_START', // 段落开始
  PARAGRAPH_END = 'PARAGRAPH_END', // 段落结束

  // 特殊令牌
  EOF = 'EOF', // 文件结束
  ERROR = 'ERROR', // 错误令牌
}

/**
 * 令牌置信度
 */
export enum TokenConfidence {
  POTENTIAL = 'POTENTIAL', // 可能的
  LIKELY = 'LIKELY', // 很可能的
  CONFIRMED = 'CONFIRMED', // 确认的
}

/**
 * 令牌接口
 */
export interface Token {
  /**
   * 令牌类型
   */
  type: TokenType;

  /**
   * 令牌内容
   */
  content: string;

  /**
   * 令牌在流中的位置
   */
  position: number;

  /**
   * 令牌长度
   */
  length: number;

  /**
   * 令牌置信度
   */
  confidence: TokenConfidence;

  /**
   * 相关元数据
   */
  metadata?: {
    /**
     * 标题级别（1-6）
     */
    level?: number;

    /**
     * 列表类型
     */
    listType?: 'ordered' | 'unordered';

    /**
     * 代码块语言
     */
    language?: string;

    /**
     * 原始标记符号
     */
    marker?: string;

    /**
     * 关联的令牌ID（用于配对）
     */
    pairId?: string;
  };
}

/**
 * 解析器状态
 */
export interface ParserState {
  /**
   * 当前位置
   */
  position: number;

  /**
   * 当前行号
   */
  line: number;

  /**
   * 当前列号
   */
  column: number;

  /**
   * 活跃的上下文栈
   */
  contextStack: ParserContext[];

  /**
   * 待确认的令牌
   */
  pendingTokens: Token[];

  /**
   * 最近的令牌历史
   */
  recentTokens: Token[];
}

/**
 * 解析器上下文
 */
export interface ParserContext {
  /**
   * 上下文类型
   */
  type: ContextType;

  /**
   * 开始位置
   */
  startPosition: number;

  /**
   * 开始标记
   */
  startMarker: string;

  /**
   * 相关元数据
   */
  metadata?: Record<string, unknown>;
}

/**
 * 上下文类型
 */
export enum ContextType {
  ROOT = 'ROOT',
  PARAGRAPH = 'PARAGRAPH',
  EMPHASIS = 'EMPHASIS',
  STRONG = 'STRONG',
  CODE = 'CODE',
  LINK = 'LINK',
  IMAGE = 'IMAGE',
  HEADING = 'HEADING',
  LIST = 'LIST',
  LIST_ITEM = 'LIST_ITEM',
  BLOCKQUOTE = 'BLOCKQUOTE',
  CODE_BLOCK = 'CODE_BLOCK',
}

/**
 * 令牌生成事件数据
 */
export interface TokenGeneratedEventData extends BaseEventData {
  token: Token;
}

/**
 * 令牌确认事件数据
 */
export interface TokenConfirmedEventData extends BaseEventData {
  originalToken: Token;
  confirmedToken: Token;
}

/**
 * 令牌撤销事件数据
 */
export interface TokenRevokedEventData extends BaseEventData {
  revokedToken: Token;
  reason: string;
}

/**
 * 解析错误事件数据
 */
export interface ParseErrorEventData extends BaseEventData {
  error: Error;
  position: number;
  context: string;
}

/**
 * 状态变更事件数据
 */
export interface StateChangeEventData extends BaseEventData {
  previousState: ParserState;
  newState: ParserState;
}

/**
 * 回溯事件数据
 */
export interface BacktrackEventData extends BaseEventData {
  fromPosition: number;
  toPosition: number;
  reason: string;
}

/**
 * 解析器事件映射
 */
export interface ParserEventMap {
  'token:generated': TokenGeneratedEventData;
  'token:confirmed': TokenConfirmedEventData;
  'token:revoked': TokenRevokedEventData;
  'parse:error': ParseErrorEventData;
  'state:change': StateChangeEventData;
  'parse:backtrack': BacktrackEventData;
}
