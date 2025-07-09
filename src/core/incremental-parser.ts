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
        tokens.push(
          this.createPotentialToken(TokenType.POTENTIAL_HEADING, headingPrefix, { level })
        );
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
        // 可能是强调或分隔线
        tokens.push(...this.processEmphasisOrHR(char));
      }
    } else if (char === '-' || char === '+') {
      // 可能是列表或分隔线
      tokens.push(...this.processListOrHR(char));
    } else if (char === '`') {
      // 可能是代码
      tokens.push(...this.processCodeMarker(char));
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
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_STRONG, char + char));
      this.bufferManager.read(1); // 消费下一个字符
    } else {
      // 单字符，可能是斜体
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_EMPHASIS, char));
    }

    // 暂时不自动确认令牌，保持为可能性令牌

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
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_CODE_BLOCK, '```'));
      this.bufferManager.read(2); // 消费两个字符
    } else {
      // 单个反引号，行内代码
      tokens.push(this.createPotentialToken(TokenType.POTENTIAL_CODE, char));
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
   * 检查强调确认
   */
  private checkEmphasisConfirmation(tokens: Token[]): void {
    // 简化实现：检查待确认令牌
    const pending = this.state.pendingTokens;
    for (let i = 0; i < pending.length; i++) {
      const token = pending[i];
      if (
        token.type === TokenType.POTENTIAL_EMPHASIS ||
        token.type === TokenType.POTENTIAL_STRONG
      ) {
        // 简单的确认逻辑：如果找到配对的标记，确认令牌
        const confirmed = this.confirmEmphasisToken(token);
        if (confirmed) {
          tokens.push(confirmed);
          pending.splice(i, 1);
          i--;
        }
      }
    }
  }

  /**
   * 确认强调令牌
   */
  private confirmEmphasisToken(token: Token): Token | null {
    // 简化实现
    if (token.type === TokenType.POTENTIAL_EMPHASIS) {
      const confirmed = {
        ...token,
        type: TokenType.EMPHASIS_START,
        confidence: TokenConfidence.CONFIRMED,
      };
      this.pushContext(ContextType.EMPHASIS, token.content);
      return confirmed;
    } else if (token.type === TokenType.POTENTIAL_STRONG) {
      const confirmed = {
        ...token,
        type: TokenType.STRONG_START,
        confidence: TokenConfidence.CONFIRMED,
      };
      this.pushContext(ContextType.STRONG, token.content);
      return confirmed;
    }
    return null;
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

    // 添加到待确认列表（不要重复添加已确认的令牌）
    if (token.confidence === TokenConfidence.POTENTIAL) {
      this.state.pendingTokens.push(token);
    }

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

    // 处理所有待确认的令牌
    for (const pending of this.state.pendingTokens) {
      // 无法确认的令牌根据其原始内容转为文本
      if (
        pending.type === TokenType.POTENTIAL_STRONG ||
        pending.type === TokenType.POTENTIAL_EMPHASIS ||
        pending.type === TokenType.POTENTIAL_CODE ||
        pending.type === TokenType.POTENTIAL_CODE_BLOCK
      ) {
        // 这些特殊标记需要原样输出
        tokens.push(this.createTextToken(pending.content));
      } else {
        // 其他令牌也转为文本
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
      }
      this.popContext();
    }

    // 添加 EOF 令牌
    tokens.push(this.createToken(TokenType.EOF, ''));

    return tokens;
  }
}
