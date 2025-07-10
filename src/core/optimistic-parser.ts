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
  | 'EXPECT_BOLD_SECOND' // 期待第二个*来确认加粗
  | 'IN_BOLD' // 在加粗中
  | 'IN_ITALIC' // 在斜体中
  | 'ENDING_BOLD' // 即将结束加粗
  | 'ENDING_ITALIC' // 即将结束斜体
  | 'IN_CODE' // 在代码中
  | 'IN_CODE_BLOCK' // 在代码块中
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
  index?: number; // 在多字符序列中的索引（如第1个*，第2个*）
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
  | 'HORIZONTAL_RULE'
  | 'CORRECTION_TO_BOLD_START' // 修正：撤销斜体，改为加粗开始
  | 'CORRECTION_TO_TEXT_SPACE' // 修正：撤销格式，改为空格
  | 'CORRECTION_TO_LINE_BREAK' // 修正：撤销格式，改为换行
  | 'CORRECTION_CANCEL_ITALIC'; // 修正：取消斜体格式

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

      case 'EXPECT_BOLD_SECOND':
        this.handleExpectBoldSecondState(char);
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
    if (char === '*') {
      // 乐观预测：立即输出斜体开始令牌
      this.state = 'EXPECT_BOLD_SECOND';
      this.contextStack.push({
        type: 'ITALIC',
        startPosition: this.position,
        markerCount: 1,
      });
      this.emitToken({ type: 'ITALIC_START' });
      this.potentialStartPosition = this.position;
    } else if (char === '_') {
      // 直接进入斜体状态
      this.state = 'IN_ITALIC';
      this.contextStack.push({
        type: 'ITALIC',
        startPosition: this.position,
        markerCount: 1,
      });
      this.emitToken({ type: 'ITALIC_START' });
    } else if (char === '`') {
      // 直接进入代码状态
      this.state = 'IN_CODE';
      this.contextStack.push({
        type: 'CODE',
        startPosition: this.position,
      });
      this.emitToken({ type: 'CODE_START' });
    } else if (char === '[') {
      // 直接进入链接状态
      this.state = 'IN_LINK_TEXT';
      this.emitToken({ type: 'LINK_TEXT_START' });
    } else if (char === '\n') {
      this.handleLineBreak();
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理期待第二个*的状态
   */
  private handleExpectBoldSecondState(char: string): void {
    if (char === '*') {
      // 修正预测：从斜体改为加粗（一对一原则）
      this.contextStack.pop(); // 移除斜体上下文
      this.state = 'IN_BOLD';
      this.contextStack.push({
        type: 'BOLD',
        startPosition: this.potentialStartPosition,
        markerCount: 2,
      });
      this.emitToken({ type: 'CORRECTION_TO_BOLD_START' });
    } else if (char === ' ') {
      // 预期违背：*后面跟空格，撤销斜体格式（一对一原则）
      this.contextStack.pop(); // 移除斜体上下文
      this.state = 'NORMAL';
      this.emitToken({ type: 'CORRECTION_TO_TEXT_SPACE' });
    } else if (char === '\n') {
      // 预期违背：*后面跟换行，撤销斜体格式（一对一原则）
      this.contextStack.pop(); // 移除斜体上下文
      this.state = 'NORMAL';
      this.emitToken({ type: 'CORRECTION_TO_LINE_BREAK' });
    } else {
      // 确认是斜体，继续处理
      this.state = 'IN_ITALIC';
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理加粗状态
   */
  private handleInBoldState(char: string): void {
    if (char === '*') {
      // 可能是结束标记
      this.state = 'ENDING_BOLD';
      this.pendingMarkers = char;
      // 第一个结束标记 - 发出带索引的令牌
      this.emitToken({ type: 'BOLD_END', index: 1 });
    } else if (char === '_') {
      // 嵌套的斜体 - 直接进入斜体状态
      this.state = 'IN_ITALIC';
      this.contextStack.push({
        type: 'ITALIC',
        startPosition: this.position,
        markerCount: 1,
      });
      this.emitToken({ type: 'ITALIC_START' });
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理斜体状态
   */
  private handleInItalicState(char: string): void {
    if (char === '*' && this.contextStack.length > 0) {
      const context = this.contextStack[this.contextStack.length - 1];
      if (context && context.type === 'ITALIC' && context.markerCount === 1) {
        // 可能是结束斜体的 *，但需要等待确认字符
        this.state = 'ENDING_ITALIC';
        this.pendingMarkers = char;
      } else {
        // 在其他上下文中遇到 *，当作普通文本处理
        this.emitToken({ type: 'TEXT', content: char });
      }
    } else if (char === '_' && this.contextStack.length > 0) {
      const context = this.contextStack[this.contextStack.length - 1];
      if (context && context.type === 'ITALIC') {
        // 结束斜体
        this.contextStack.pop();
        this.emitToken({ type: 'ITALIC_END' });
        this.state = this.contextStack.length > 0 ? this.getStateForContext() : 'NORMAL';
      }
    } else {
      this.emitToken({ type: 'TEXT', content: char });
    }
  }

  /**
   * 处理即将结束加粗状态
   */
  private handleEndingBoldState(char: string): void {
    if (char === '*' && this.pendingMarkers.length === 1) {
      // 第二个结束标记 - 确认结束加粗
      this.contextStack.pop();
      this.emitToken({ type: 'BOLD_END', index: 2 });
      this.pendingMarkers = '';
      this.state = this.contextStack.length > 0 ? this.getStateForContext() : 'NORMAL';
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
  private handleEndingItalicState(char: string): void {
    if (
      char === ' ' ||
      char === '\n' ||
      char === '\t' ||
      char === '.' ||
      char === ',' ||
      char === '!' ||
      char === '?'
    ) {
      // 确认结束斜体 - 空白字符或标点符号确认斜体结束
      this.contextStack.pop();
      this.emitToken({ type: 'ITALIC_END' });
      this.pendingMarkers = '';
      this.state = this.contextStack.length > 0 ? this.getStateForContext() : 'NORMAL';
      // 处理当前字符
      this.processChar(char);
    } else {
      // 不是结束标记，回到斜体状态
      this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
      this.pendingMarkers = '';
      this.state = 'IN_ITALIC';
      this.processChar(char);
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
   * 结束解析 - 乐观完成所有未完成的格式
   */
  end(): void {
    // 处理未完成的状态 - 将待定的标记当作普通文本输出
    if (this.pendingMarkers) {
      this.emitToken({ type: 'TEXT', content: this.pendingMarkers });
      this.pendingMarkers = '';
    }

    // 乐观完成所有未关闭的上下文 - 在不确定的情况下保持格式
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
