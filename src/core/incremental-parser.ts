/**
 * 增量解析器 - 将字符流解析为 Markdown 令牌
 *
 * 核心功能：
 * 1. 维护解析状态机
 * 2. 生成可能性令牌
 * 3. 支持智能回溯
 * 4. 处理流式输入
 */

import { EventBus } from '../infrastructure/event-bus';
import { BufferManager } from './buffer-manager';
import {
  Token,
  TokenType,
  TokenConfidence,
  ParserState,
  ParserContext,
  ContextType,
} from '../types/parser-events';

/**
 * 解析器配置选项
 */
export interface IncrementalParserOptions {
  /**
   * 事件总线实例
   */
  eventBus?: EventBus;

  /**
   * 缓冲管理器实例
   */
  bufferManager?: BufferManager;

  /**
   * 最大回溯距离
   * @default 100
   */
  maxBacktrackDistance?: number;

  /**
   * 令牌历史记录大小
   * @default 20
   */
  tokenHistorySize?: number;

  /**
   * 启用智能预判
   * @default true
   */
  enableSmartPrediction?: boolean;
}

/**
 * 增量解析器类
 */
export class IncrementalParser {
  private eventBus: EventBus;
  private bufferManager: BufferManager;
  private state: ParserState;
  private options: Required<IncrementalParserOptions>;

  constructor(options: IncrementalParserOptions = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.bufferManager = options.bufferManager || new BufferManager({ bufferSize: 1024 });

    this.options = {
      eventBus: this.eventBus,
      bufferManager: this.bufferManager,
      maxBacktrackDistance: options.maxBacktrackDistance ?? 100,
      tokenHistorySize: options.tokenHistorySize ?? 20,
      enableSmartPrediction: options.enableSmartPrediction ?? true,
    };

    // 初始化状态
    this.state = this.createInitialState();
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): ParserState {
    return {
      position: 0,
      line: 1,
      column: 1,
      contextStack: [{ type: ContextType.ROOT, startPosition: 0, startMarker: '' }],
      pendingTokens: [],
      recentTokens: [],
    };
  }

  /**
   * 解析输入流
   */
  parse(input: string): Token[] {
    // 写入缓冲区
    this.bufferManager.write(input);

    const tokens: Token[] = [];

    // 先尝试延迟确认之前的潜在令牌
    const delayedTokens = this.tryDelayedConfirmation();
    tokens.push(...delayedTokens);

    // 逐字符处理
    while (this.bufferManager.available() > 0) {
      const char = this.bufferManager.read(1);
      if (!char) break;

      const newTokens = this.processCharacter(char);
      tokens.push(...newTokens);

      // 更新位置信息
      this.updatePosition(char);
    }

    return tokens;
  }

  /**
   * 处理单个字符
   */
  private processCharacter(char: string): Token[] {
    const tokens: Token[] = [];
    const context = this.getCurrentContext();

    // 根据当前上下文处理字符
    switch (context.type) {
      case ContextType.ROOT:
        tokens.push(...this.processRootContext(char));
        break;
      case ContextType.PARAGRAPH:
        tokens.push(...this.processParagraphContext(char));
        break;
      case ContextType.CODE:
        tokens.push(...this.processCodeContext(char));
        break;
      case ContextType.CODE_BLOCK:
        tokens.push(...this.processCodeBlockContext(char));
        break;
      case ContextType.EMPHASIS:
      case ContextType.STRONG:
        tokens.push(...this.processEmphasisContext(char, context));
        break;
      case ContextType.LINK:
      case ContextType.IMAGE:
        tokens.push(...this.processLinkContext(char, context));
        break;
      default:
        tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理根上下文
   */
  private processRootContext(char: string): Token[] {
    const tokens: Token[] = [];

    // 检查特殊字符
    if (char === '#') {
      // 可能是标题
      const ahead = this.bufferManager.peek(0, 6);
      const headingMatch = (char + ahead).match(/^(#{1,6})\s/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        // 收集所有的井号
        let headingPrefix = char;
        for (let i = 1; i < level; i++) {
          const nextChar = this.bufferManager.read(1);
          if (nextChar) {
            headingPrefix += nextChar;
            this.updatePosition(nextChar);
          }
        }
        // 立即确认标题
        tokens.push(this.createConfirmedToken(TokenType.HEADING_START, headingPrefix));
        const headingToken = tokens[tokens.length - 1];
        headingToken.metadata = { level };
        this.pushContext(ContextType.HEADING, headingPrefix);
      } else {
        tokens.push(this.createTextToken(char));
      }
    } else if (char === '*' || char === '_') {
      // 检查是否是列表（星号后跟空格）
      if (char === '*' && this.bufferManager.peek(0, 1) === ' ') {
        tokens.push(
          this.createPotentialToken(TokenType.POTENTIAL_LIST_ITEM, char, { listType: 'unordered' })
        );
      } else {
        // 可能是强调或分隔线，需要检查完整模式
        tokens.push(...this.processEmphasisOrHR(char));
      }
    } else if (char === '-' || char === '+') {
      // 可能是列表或分隔线
      tokens.push(...this.processListOrHR(char));
    } else if (char === '`') {
      // 在根上下文中，代码标记也总是创建潜在令牌
      const ahead = this.bufferManager.peek(0, 2);
      if (ahead === '``') {
        // 三个反引号，代码块 - 这个可以立即确认
        tokens.push(this.createConfirmedToken(TokenType.CODE_BLOCK_START, '```'));
        this.bufferManager.read(2); // 消费两个字符
        this.pushContext(ContextType.CODE_BLOCK, '```');
      } else {
        // 单个反引号，可能是行内代码 - 创建潜在令牌
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_CODE, char));
      }
    } else if (char === '[') {
      // 可能是链接
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_LINK_START, char));
    } else if (char === '!') {
      // 可能是图片
      const next = this.bufferManager.peek(0, 1);
      if (next === '[') {
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_IMAGE_START, char + next));
        this.bufferManager.read(1); // 消费下一个字符
      } else {
        tokens.push(this.createTextToken(char));
      }
    } else if (char === '>') {
      // 可能是引用
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_BLOCKQUOTE, char));
    } else if (char === '\n') {
      // 换行符
      tokens.push(this.createToken(TokenType.NEWLINE, char));
      this.checkParagraphBoundary(tokens);
    } else if (/\s/.test(char)) {
      // 空白字符
      tokens.push(this.createToken(TokenType.WHITESPACE, char));
    } else if (/\d/.test(char)) {
      // 可能是有序列表
      const ahead = this.bufferManager.peek(0, 10);
      if (/^\d+\.\s/.test(char + ahead)) {
        tokens.push(
          this.createPotentialToken(TokenType.POTENTIAL_LIST_ITEM, char, { listType: 'ordered' })
        );
      } else {
        tokens.push(this.createTextToken(char));
      }
    } else {
      // 普通文本
      tokens.push(this.createTextToken(char));
      // 在根上下文中才开始段落（避免影响标题等块级元素的识别）
      if (!this.isInParagraph() && this.getCurrentContext().type === ContextType.ROOT) {
        tokens.unshift(this.createToken(TokenType.PARAGRAPH_START, ''));
        this.pushContext(ContextType.PARAGRAPH);
      }
    }

    return tokens;
  }

  /**
   * 处理段落上下文
   */
  private processParagraphContext(char: string): Token[] {
    const tokens: Token[] = [];

    if (char === '\n') {
      // 检查是否是段落结束（双换行）
      const next = this.bufferManager.peek(0, 1);
      if (next === '\n') {
        tokens.push(this.createToken(TokenType.NEWLINE, char));
        tokens.push(this.createToken(TokenType.PARAGRAPH_END, ''));
        this.popContext();
      } else {
        tokens.push(this.createToken(TokenType.NEWLINE, char));
      }
    } else if (char === '*' || char === '_') {
      tokens.push(...this.processEmphasisMarker(char));
    } else if (char === '`') {
      tokens.push(...this.processCodeMarker(char));
    } else if (char === '[') {
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_LINK_START, char));
    } else if (/\s/.test(char)) {
      tokens.push(this.createToken(TokenType.WHITESPACE, char));
    } else {
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理强调标记
   */
  private processEmphasisMarker(char: string): Token[] {
    const tokens: Token[] = [];
    const next = this.bufferManager.peek(0, 1);

    if (next === char) {
      // 双字符，可能是加粗
      const marker = char + char;
      this.bufferManager.read(1); // 消费下一个字符

      // 先尝试立即确认
      if (this.canConfirmStrong(marker)) {
        tokens.push(this.createConfirmedToken(TokenType.STRONG_START, marker));
        this.pushContext(ContextType.STRONG, marker);
      } else {
        // 无法立即确认，创建潜在令牌
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_STRONG, marker));
      }
    } else {
      // 单字符，可能是斜体
      if (this.canConfirmEmphasis(char)) {
        tokens.push(this.createConfirmedToken(TokenType.EMPHASIS_START, char));
        this.pushContext(ContextType.EMPHASIS, char);
      } else {
        // 无法立即确认，创建潜在令牌
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_EMPHASIS, char));
      }
    }

    return tokens;
  }

  /**
   * 处理代码标记
   */
  private processCodeMarker(char: string): Token[] {
    const tokens: Token[] = [];
    const ahead = this.bufferManager.peek(0, 2);

    if (ahead === '``') {
      // 三个反引号，代码块
      tokens.push(this.createConfirmedToken(TokenType.CODE_BLOCK_START, '```'));
      this.bufferManager.read(2); // 消费两个字符
      this.pushContext(ContextType.CODE_BLOCK, '```');
    } else {
      // 单个反引号，行内代码
      if (this.canConfirmCode(char)) {
        tokens.push(this.createConfirmedToken(TokenType.CODE_START, char));
        this.pushContext(ContextType.CODE, char);
      } else {
        // 无法立即确认，创建潜在令牌
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_CODE, char));
      }
    }

    return tokens;
  }

  /**
   * 处理强调或分隔线
   */
  private processEmphasisOrHR(char: string): Token[] {
    const tokens: Token[] = [];
    const ahead = this.bufferManager.peek(0, 5);
    const line = char + ahead;

    // 检查是否是分隔线（至少3个连续的相同字符）
    if (char === '*' || char === '_') {
      // 使用更准确的正则表达式检查
      const isStar = char === '*';
      const pattern = isStar ? /^\*{3,}/ : /^_{3,}/;

      if (pattern.test(line)) {
        // 这是分隔线
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_HORIZONTAL_RULE, char));
      } else {
        // 可能是强调
        tokens.push(...this.processEmphasisMarker(char));
      }
    } else {
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理列表或分隔线
   */
  private processListOrHR(char: string): Token[] {
    const tokens: Token[] = [];
    const ahead = this.bufferManager.peek(0, 5);

    if (char === '-') {
      // 首先检查是否是列表（字符后直接跟空格）
      if (ahead[0] === ' ') {
        tokens.push(
          this.createPotentialToken(TokenType.POTENTIAL_LIST_ITEM, char, { listType: 'unordered' })
        );
      }
      // 检查是否是分隔线（至少3个连续的减号）
      else if (/^-{2,}/.test(ahead)) {
        tokens.push(this.createPotentialToken(TokenType.POTENTIAL_HORIZONTAL_RULE, char));
      } else {
        tokens.push(this.createTextToken(char));
      }
    } else if (char === '+' && ahead[0] === ' ') {
      // + 只能是列表
      tokens.push(
        this.createPotentialToken(TokenType.POTENTIAL_LIST_ITEM, char, { listType: 'unordered' })
      );
    } else {
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理代码上下文
   */
  private processCodeContext(char: string): Token[] {
    const tokens: Token[] = [];

    if (char === '`') {
      // 可能是代码结束
      tokens.push(this.createToken(TokenType.CODE_END, char));
      this.popContext();
    } else {
      // 代码内容，直接作为文本
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理代码块上下文
   */
  private processCodeBlockContext(char: string): Token[] {
    const tokens: Token[] = [];

    if (char === '`' && this.bufferManager.peek(0, 2) === '``') {
      // 代码块结束
      tokens.push(this.createToken(TokenType.CODE_BLOCK_END, '```'));
      this.bufferManager.read(2);
      this.popContext();
    } else {
      // 代码块内容
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理强调上下文
   */
  private processEmphasisContext(char: string, context: ParserContext): Token[] {
    const tokens: Token[] = [];
    const marker = context.startMarker;

    if (char === marker[0]) {
      if (context.type === ContextType.STRONG && this.bufferManager.peek(0, 1) === marker[0]) {
        // 加粗结束
        tokens.push(this.createToken(TokenType.STRONG_END, marker));
        this.bufferManager.read(1);
        this.popContext();
      } else if (context.type === ContextType.EMPHASIS) {
        // 斜体结束
        tokens.push(this.createToken(TokenType.EMPHASIS_END, char));
        this.popContext();
      } else if (context.type === ContextType.STRONG && marker === '**') {
        // 在双星号强调上下文中遇到单个星号，处理为嵌套斜体
        tokens.push(...this.processEmphasisMarker(char));
      } else {
        tokens.push(this.createTextToken(char));
      }
    } else if ((char === '*' || char === '_') && char !== marker[0]) {
      // 在强调上下文中遇到不同的强调标记，可能是嵌套强调
      tokens.push(...this.processEmphasisMarker(char));
    } else {
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 处理链接上下文
   */
  private processLinkContext(char: string, _context: ParserContext): Token[] {
    const tokens: Token[] = [];

    // 简化的链接处理
    if (char === ']') {
      tokens.push(this.createToken(TokenType.LINK_TEXT_END, char));
    } else if (char === '(') {
      tokens.push(this.createToken(TokenType.LINK_URL_START, char));
    } else if (char === ')') {
      tokens.push(this.createToken(TokenType.LINK_END, char));
      this.popContext();
    } else {
      tokens.push(this.createTextToken(char));
    }

    return tokens;
  }

  /**
   * 检查是否可以确认强调为加粗格式
   */
  private canConfirmStrong(marker: string): boolean {
    const ahead = this.bufferManager.peek(0, 50);
    if (ahead.length === 0) {
      // 缓冲区为空，可能是流式输入，延迟确认
      return false;
    }

    // 如果缓冲区内容少于最小合理长度，可能需要等待更多输入
    if (ahead.length < 3) {
      return false;
    }

    // 检查是否以非空格字符开始
    if (ahead.startsWith(' ')) return false;

    // 查找结束标记
    const endIndex = ahead.indexOf(marker);
    if (endIndex === -1) {
      // 没有找到结束标记，但如果缓冲区已经很长，可能不会有结束标记
      if (ahead.length >= 30) {
        return false; // 确定没有结束标记，不是格式
      }
      return false; // 等待更多输入
    }

    // 确保结束标记前有内容
    if (endIndex === 0) return false;

    // 确保结束标记前不是空格
    if (ahead[endIndex - 1] === ' ') return false;

    return true;
  }

  /**
   * 检查是否可以确认强调为斜体格式
   */
  private canConfirmEmphasis(marker: string): boolean {
    const ahead = this.bufferManager.peek(0, 50);
    if (ahead.length === 0) {
      return false;
    }

    if (ahead.length < 2) {
      return false;
    }

    // 检查是否以非空格字符开始
    if (ahead.startsWith(' ')) return false;

    // 查找结束标记
    const endIndex = ahead.indexOf(marker);
    if (endIndex === -1) {
      if (ahead.length >= 30) {
        return false;
      }
      return false;
    }

    // 确保结束标记前有内容
    if (endIndex === 0) return false;

    // 确保结束标记前不是空格
    if (ahead[endIndex - 1] === ' ') return false;

    return true;
  }

  /**
   * 检查是否可以确认代码格式
   */
  private canConfirmCode(marker: string): boolean {
    const ahead = this.bufferManager.peek(0, 20);
    if (ahead.length === 0) {
      return false;
    }

    if (ahead.length < 2) {
      return false;
    }

    // 检查是否以非空格字符开始
    if (ahead.startsWith(' ')) return false;

    // 查找结束标记
    const endIndex = ahead.indexOf(marker);
    if (endIndex === -1) {
      if (ahead.length >= 15) {
        return false;
      }
      return false;
    }

    // 确保结束标记前有内容
    if (endIndex === 0) return false;

    return true;
  }

  /**
   * 尝试延迟确认待确认的令牌
   */
  private tryDelayedConfirmation(): Token[] {
    const tokens: Token[] = [];
    const confirmed: Token[] = [];
    const remaining: Token[] = [];

    for (const pending of this.state.pendingTokens) {
      if (pending.type === TokenType.POTENTIAL_STRONG && pending.content === '**') {
        if (this.canConfirmStrong('**')) {
          confirmed.push(this.createConfirmedToken(TokenType.STRONG_START, '**'));
          this.pushContext(ContextType.STRONG, '**');
        } else {
          remaining.push(pending);
        }
      } else if (pending.type === TokenType.POTENTIAL_EMPHASIS && pending.content.length === 1) {
        if (this.canConfirmEmphasis(pending.content)) {
          confirmed.push(this.createConfirmedToken(TokenType.EMPHASIS_START, pending.content));
          this.pushContext(ContextType.EMPHASIS, pending.content);
        } else {
          remaining.push(pending);
        }
      } else if (pending.type === TokenType.POTENTIAL_CODE && pending.content === '`') {
        if (this.canConfirmCode('`')) {
          confirmed.push(this.createConfirmedToken(TokenType.CODE_START, '`'));
          this.pushContext(ContextType.CODE, '`');
        } else {
          remaining.push(pending);
        }
      } else {
        remaining.push(pending);
      }
    }

    this.state.pendingTokens = remaining;
    tokens.push(...confirmed);

    return tokens;
  }

  /**
   * 创建确认的令牌
   */
  private createConfirmedToken(type: TokenType, content: string): Token {
    return this.createToken(type, content, TokenConfidence.CONFIRMED);
  }

  /**
   * 检查段落边界
   */
  private checkParagraphBoundary(tokens: Token[]): void {
    if (this.isInParagraph()) {
      const lastToken = this.state.recentTokens[this.state.recentTokens.length - 1];
      if (lastToken && lastToken.type === TokenType.NEWLINE) {
        // 双换行，结束段落
        tokens.push(this.createToken(TokenType.PARAGRAPH_END, ''));
        this.popContext();
      }
    }
  }

  /**
   * 创建令牌
   */
  private createToken(
    type: TokenType,
    content: string,
    confidence = TokenConfidence.CONFIRMED
  ): Token {
    const token: Token = {
      type,
      content,
      position: this.state.position,
      length: content.length,
      confidence,
    };

    // 记录令牌
    this.addToHistory(token);

    // 发射事件
    this.eventBus.emit('token:generated', { token, timestamp: Date.now() });

    return token;
  }

  /**
   * 创建可能性令牌
   */
  private createPotentialToken(
    type: TokenType,
    content: string,
    metadata?: Record<string, unknown>
  ): Token {
    const token = this.createToken(type, content, TokenConfidence.POTENTIAL);
    if (metadata) {
      token.metadata = metadata as Token['metadata'];
    }

    // 添加到待确认列表
    this.state.pendingTokens.push(token);

    return token;
  }

  /**
   * 创建文本令牌
   */
  private createTextToken(content: string): Token {
    return this.createToken(TokenType.TEXT, content);
  }

  /**
   * 更新位置信息
   */
  private updatePosition(char: string): void {
    this.state.position++;
    if (char === '\n') {
      this.state.line++;
      this.state.column = 1;
    } else {
      this.state.column++;
    }
  }

  /**
   * 获取当前上下文
   */
  private getCurrentContext(): ParserContext {
    return this.state.contextStack[this.state.contextStack.length - 1];
  }

  /**
   * 压入新上下文
   */
  private pushContext(type: ContextType, startMarker = ''): void {
    this.state.contextStack.push({
      type,
      startPosition: this.state.position,
      startMarker,
    });
  }

  /**
   * 弹出上下文
   */
  private popContext(): void {
    if (this.state.contextStack.length > 1) {
      this.state.contextStack.pop();
    }
  }

  /**
   * 检查是否在段落中
   */
  private isInParagraph(): boolean {
    return this.state.contextStack.some(ctx => ctx.type === ContextType.PARAGRAPH);
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(token: Token): void {
    this.state.recentTokens.push(token);
    if (this.state.recentTokens.length > this.options.tokenHistorySize) {
      this.state.recentTokens.shift();
    }
  }

  /**
   * 回溯到指定位置
   */
  backtrack(distance: number): void {
    if (distance > this.options.maxBacktrackDistance) {
      throw new Error(
        `Backtrack distance ${distance} exceeds maximum ${this.options.maxBacktrackDistance}`
      );
    }

    const newPosition = Math.max(0, this.state.position - distance);
    this.bufferManager.backtrack(distance);

    // 发射回溯事件
    this.eventBus.emit('parse:backtrack', {
      fromPosition: this.state.position,
      toPosition: newPosition,
      reason: 'Manual backtrack',
      timestamp: Date.now(),
    });

    // 重置相关状态
    this.state.position = newPosition;
    this.state.pendingTokens = [];
  }

  /**
   * 重置解析器
   */
  reset(): void {
    this.state = this.createInitialState();
    this.bufferManager.clear();
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<ParserState> {
    return { ...this.state };
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 结束解析
   */
  end(): Token[] {
    const tokens: Token[] = [];

    // 最后一次尝试延迟确认
    const finalDelayedTokens = this.tryDelayedConfirmation();
    tokens.push(...finalDelayedTokens);

    // 处理所有剩余的待确认令牌
    for (const pending of this.state.pendingTokens) {
      // 在流结束时，尝试强制确认某些格式
      if (pending.type === TokenType.POTENTIAL_STRONG && pending.content === '**') {
        // 检查是否有匹配的结束标记
        const remainingContent = this.bufferManager.peek(0, 100);
        const endIndex = remainingContent.indexOf('**');
        if (endIndex !== -1 && endIndex > 0) {
          // 找到匹配的结束标记，确认为强调
          tokens.push(this.createConfirmedToken(TokenType.STRONG_START, '**'));
          this.pushContext(ContextType.STRONG, '**');
        } else {
          // 没有匹配的结束标记，输出为文本
          tokens.push(this.createTextToken(pending.content));
        }
      } else if (pending.type === TokenType.POTENTIAL_EMPHASIS && pending.content.length === 1) {
        // 检查是否有匹配的结束标记
        const remainingContent = this.bufferManager.peek(0, 100);
        const endIndex = remainingContent.indexOf(pending.content);
        if (endIndex !== -1 && endIndex > 0) {
          tokens.push(this.createConfirmedToken(TokenType.EMPHASIS_START, pending.content));
          this.pushContext(ContextType.EMPHASIS, pending.content);
        } else {
          tokens.push(this.createTextToken(pending.content));
        }
      } else if (pending.type === TokenType.POTENTIAL_CODE && pending.content === '`') {
        // 检查是否有匹配的结束标记
        const remainingContent = this.bufferManager.peek(0, 100);
        const endIndex = remainingContent.indexOf('`');
        if (endIndex !== -1 && endIndex > 0) {
          tokens.push(this.createConfirmedToken(TokenType.CODE_START, '`'));
          this.pushContext(ContextType.CODE, '`');
        } else {
          tokens.push(this.createTextToken(pending.content));
        }
      } else {
        // 其他令牌转为文本
        tokens.push(this.createTextToken(pending.content));
      }
    }

    // 清空待确认列表
    this.state.pendingTokens = [];

    // 关闭所有打开的上下文
    while (this.state.contextStack.length > 1) {
      const context = this.getCurrentContext();
      if (context.type === ContextType.PARAGRAPH) {
        tokens.push(this.createToken(TokenType.PARAGRAPH_END, ''));
      } else if (context.type === ContextType.STRONG) {
        tokens.push(this.createToken(TokenType.STRONG_END, context.startMarker));
      } else if (context.type === ContextType.EMPHASIS) {
        tokens.push(this.createToken(TokenType.EMPHASIS_END, context.startMarker));
      } else if (context.type === ContextType.CODE) {
        tokens.push(this.createToken(TokenType.CODE_END, context.startMarker));
      }
      this.popContext();
    }

    // 添加 EOF 令牌
    tokens.push(this.createToken(TokenType.EOF, ''));

    return tokens;
  }
}
