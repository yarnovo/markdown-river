/**
 * 乐观解析器 - 实现乐观更新策略的 Markdown 解析器
 *
 * 核心理念：
 * 1. 看到格式符号时立即预测可能的格式
 * 2. 一旦确认格式，立即开始渲染
 * 3. 如果预测错误，快速修正
 * 4. 无缓冲，零延迟
 */

import { EventBus } from '../infrastructure/event-bus.js';

/**
 * 解析器状态
 */
export type ParserState =
  | 'NORMAL' // 普通文本
  | 'POTENTIAL_EMPHASIS' // 可能的强调（*或_）
  | 'IN_BOLD' // 在加粗中
  | 'IN_ITALIC' // 在斜体中
  | 'ENDING_BOLD' // 即将结束加粗
  | 'ENDING_ITALIC' // 即将结束斜体
  | 'POTENTIAL_CODE' // 可能的代码
  | 'IN_CODE' // 在代码中
  | 'IN_CODE_BLOCK' // 在代码块中
  | 'POTENTIAL_LINK' // 可能的链接
  | 'IN_LINK_TEXT' // 在链接文本中
  | 'IN_LINK_URL'; // 在链接URL中

/**
 * 令牌类型
 */
export interface Token {
  type: TokenType;
  content?: string;
  correction?: boolean; // 是否是修正令牌
  position?: number;
}

export type TokenType =
  | 'TEXT'
  | 'BOLD_START'
  | 'BOLD_END'
  | 'ITALIC_START'
  | 'ITALIC_END'
  | 'CODE_START'
  | 'CODE_END'
  | 'CODE_BLOCK_START'
  | 'CODE_BLOCK_END'
  | 'LINK_TEXT_START'
  | 'LINK_TEXT_END'
  | 'LINK_URL_START'
  | 'LINK_URL_END'
  | 'PARAGRAPH_START'
  | 'PARAGRAPH_END'
  | 'HEADING'
  | 'LINE_BREAK'
  | 'LIST_ITEM'
  | 'HORIZONTAL_RULE';

/**
 * 上下文栈项
 */
interface ContextItem {
  type: 'BOLD' | 'ITALIC' | 'CODE' | 'CODE_BLOCK' | 'LINK';
  startPosition: number;
  markerCount?: number;
}

/**
 * 乐观解析器配置
 */
export interface OptimisticParserOptions {
  eventBus?: EventBus;
}

/**
 * 乐观解析器
 */
export class OptimisticParser {
  private eventBus: EventBus;
  private state: ParserState = 'NORMAL';
  private contextStack: ContextItem[] = [];
  private pendingMarkers = '';
  private position = 0;
  private lastChar = '';
  private potentialStartPosition = 0;

  constructor(options: OptimisticParserOptions = {}) {
    this.eventBus = options.eventBus || new EventBus();
  }

  /**
   * 处理输入字符
   */
  processChar(char: string): void {
    this.position++;

    switch (this.state) {
      case 'NORMAL':
        this.handleNormalState(char);
        break;

      case 'POTENTIAL_EMPHASIS':
        this.handlePotentialEmphasisState(char);
        break;

      case 'IN_BOLD':
        this.handleInBoldState(char);
        break;

      case 'IN_ITALIC':
        this.handleInItalicState(char);
        break;

      case 'ENDING_BOLD':
        this.handleEndingBoldState(char);
        break;

      case 'ENDING_ITALIC':
        this.handleEndingItalicState(char);
        break;

      case 'POTENTIAL_CODE':
        this.handlePotentialCodeState(char);
        break;

      case 'IN_CODE':
        this.handleInCodeState(char);
        break;

      case 'IN_CODE_BLOCK':
        this.handleInCodeBlockState(char);
        break;

      default:
        // 其他状态暂时作为普通文本处理
        this.emitToken({ type: 'TEXT', content: char });
    }

    this.lastChar = char;
  }

  /**
   * 处理普通状态
   */
  private handleNormalState(char: string): void {
    if (char === '*' || char === '_') {
      this.state = 'POTENTIAL_EMPHASIS';
      this.pendingMarkers = char;
      this.potentialStartPosition = this.position;
      // 不立即输出，等待确认
    } else if (char === '`') {
      this.state = 'POTENTIAL_CODE';
      this.pendingMarkers = char;
      this.potentialStartPosition = this.position;
    } else if (char === '[') {
      this.state = 'POTENTIAL_LINK';
      this.emitToken({ type: 'LINK_TEXT_START' });
    } else if (char === '\n') {
      this.handleLineBreak();
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理可能的强调状态
   */
  private handlePotentialEmphasisState(char: string): void {
    const marker = this.pendingMarkers[0];

    if (char === marker) {
      // 连续两个相同符号，很可能是加粗
      this.pendingMarkers += char;

      if (this.pendingMarkers.length === 2) {
        // 确认是加粗，开始乐观渲染
        this.state = 'IN_BOLD';
        this.contextStack.push({
          type: 'BOLD',
          startPosition: this.potentialStartPosition,
          markerCount: 2,
        });
        this.emitToken({ type: 'BOLD_START' });
        this.pendingMarkers = '';
      }
    } else if (/[a-zA-Z0-9\u4e00-\u9fa5]/.test(char)) {
      // 后面跟着字母/数字/中文，可能是斜体
      if (this.pendingMarkers.length === 1) {
        this.state = 'IN_ITALIC';
        this.contextStack.push({
          type: 'ITALIC',
          startPosition: this.potentialStartPosition,
          markerCount: 1,
        });
        this.emitToken({ type: 'ITALIC_START' });
        this.emitToken({ type: 'TEXT', content: char });
        this.pendingMarkers = '';
      }
    } else if (char === ' ' || char === '\n') {
      // 后面是空格或换行，不是格式标记
      this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
      this.pendingMarkers = '';
      this.state = 'NORMAL';
      this.processChar(char); // 重新处理当前字符
    } else {
      // 其他情况，继续观察
      this.pendingMarkers += char;

      // 如果积累太多字符，放弃预测
      if (this.pendingMarkers.length > 3) {
        this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
        this.pendingMarkers = '';
        this.state = 'NORMAL';
      }
    }
  }

  /**
   * 处理加粗状态
   */
  private handleInBoldState(char: string): void {
    if (char === '*' || char === '_') {
      const context = this.contextStack[this.contextStack.length - 1];
      if (context && context.type === 'BOLD' && char === this.getMarkerForContext(context)) {
        this.state = 'ENDING_BOLD';
        this.pendingMarkers = char;
      } else {
        // 不同的标记，可能是嵌套的斜体
        this.state = 'POTENTIAL_EMPHASIS';
        this.pendingMarkers = char;
        this.potentialStartPosition = this.position;
      }
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理斜体状态
   */
  private handleInItalicState(char: string): void {
    if (char === '*' || char === '_') {
      const context = this.contextStack[this.contextStack.length - 1];
      if (context && context.type === 'ITALIC' && char === this.getMarkerForContext(context)) {
        // 结束斜体
        this.contextStack.pop();
        this.emitToken({ type: 'ITALIC_END' });
        this.state = this.contextStack.length > 0 ? this.getStateForContext() : 'NORMAL';
      } else {
        // 可能是嵌套的加粗
        this.state = 'POTENTIAL_EMPHASIS';
        this.pendingMarkers = char;
        this.potentialStartPosition = this.position;
      }
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理即将结束加粗状态
   */
  private handleEndingBoldState(char: string): void {
    const marker = this.pendingMarkers[0];

    if (char === marker && this.pendingMarkers.length < 2) {
      this.pendingMarkers += char;
      if (this.pendingMarkers.length === 2) {
        // 确认结束加粗
        this.contextStack.pop();
        this.emitToken({ type: 'BOLD_END' });
        this.pendingMarkers = '';
        this.state = this.contextStack.length > 0 ? this.getStateForContext() : 'NORMAL';
      }
    } else {
      // 不是结束标记，回到加粗状态
      this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
      this.pendingMarkers = '';
      this.state = 'IN_BOLD';
      this.processChar(char);
    }
  }

  /**
   * 处理即将结束斜体状态
   */
  private handleEndingItalicState(_char: string): void {
    // 斜体只需要一个符号，所以直接在 handleInItalicState 中处理了
  }

  /**
   * 处理可能的代码状态
   */
  private handlePotentialCodeState(char: string): void {
    if (char === '`') {
      this.pendingMarkers += char;

      if (this.pendingMarkers.length === 3) {
        // 三个反引号，代码块
        this.state = 'IN_CODE_BLOCK';
        this.contextStack.push({
          type: 'CODE_BLOCK',
          startPosition: this.potentialStartPosition,
        });
        this.emitToken({ type: 'CODE_BLOCK_START' });
        this.pendingMarkers = '';
      }
    } else {
      // 单个反引号，行内代码
      if (this.pendingMarkers.length === 1) {
        this.state = 'IN_CODE';
        this.contextStack.push({
          type: 'CODE',
          startPosition: this.potentialStartPosition,
        });
        this.emitToken({ type: 'CODE_START' });
        this.emitToken({ type: 'TEXT', content: char });
        this.pendingMarkers = '';
      }
    }
  }

  /**
   * 处理代码状态
   */
  private handleInCodeState(char: string): void {
    if (char === '`') {
      // 结束代码
      this.contextStack.pop();
      this.emitToken({ type: 'CODE_END' });
      this.state = this.contextStack.length > 0 ? this.getStateForContext() : 'NORMAL';
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理代码块状态
   */
  private handleInCodeBlockState(char: string): void {
    if (char === '`' && this.lastChar === '`' && this.pendingMarkers === '`') {
      // 三个反引号，结束代码块
      this.contextStack.pop();
      this.emitToken({ type: 'CODE_BLOCK_END' });
      this.state = 'NORMAL';
      this.pendingMarkers = '';
    } else if (char === '`') {
      this.pendingMarkers += char;
    } else {
      if (this.pendingMarkers) {
        this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
        this.pendingMarkers = '';
      }
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理换行
   */
  private handleLineBreak(): void {
    // 简单处理，后续可以增强
    this.emitToken({ type: 'LINE_BREAK' });
  }

  /**
   * 获取上下文对应的标记符
   */
  private getMarkerForContext(_context: ContextItem): string {
    // 这里简化处理，实际应该记录使用的是 * 还是 _
    return '*';
  }

  /**
   * 根据当前上下文栈获取状态
   */
  private getStateForContext(): ParserState {
    const context = this.contextStack[this.contextStack.length - 1];
    if (!context) return 'NORMAL';

    switch (context.type) {
      case 'BOLD':
        return 'IN_BOLD';
      case 'ITALIC':
        return 'IN_ITALIC';
      case 'CODE':
        return 'IN_CODE';
      case 'CODE_BLOCK':
        return 'IN_CODE_BLOCK';
      default:
        return 'NORMAL';
    }
  }

  /**
   * 发射令牌
   */
  private emitToken(token: Token): void {
    this.eventBus.emit('parser:token', {
      token,
      position: this.position,
      timestamp: Date.now(),
    });
  }

  /**
   * 结束解析
   */
  end(): void {
    // 处理未完成的状态
    if (this.pendingMarkers) {
      this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
      this.pendingMarkers = '';
    }

    // 关闭所有未关闭的上下文
    while (this.contextStack.length > 0) {
      const context = this.contextStack.pop()!;
      if (context.type === 'BOLD') {
        this.emitToken({ type: 'BOLD_END', correction: true });
      } else if (context.type === 'ITALIC') {
        this.emitToken({ type: 'ITALIC_END', correction: true });
      } else if (context.type === 'CODE') {
        this.emitToken({ type: 'CODE_END', correction: true });
      } else if (context.type === 'CODE_BLOCK') {
        this.emitToken({ type: 'CODE_BLOCK_END', correction: true });
      }
    }

    this.eventBus.emit('parser:end', {
      position: this.position,
      timestamp: Date.now(),
    });
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.state = 'NORMAL';
    this.contextStack = [];
    this.pendingMarkers = '';
    this.position = 0;
    this.lastChar = '';
    this.potentialStartPosition = 0;
  }
}
