import { EventBus } from './EventBus.js';
import {
  ParseEvent,
  ParseEventType,
  ParserState,
  MarkdownElementType,
  PendingElement,
} from '../types/index.js';

export class IncrementalParser {
  private eventBus: EventBus;
  private state: ParserState;
  private eventIdCounter = 0;
  private tempEvents: Map<number, ParseEvent> = new Map();
  private destroyed = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.state = this.createInitialState();
  }

  private createInitialState(): ParserState {
    return {
      mode: 'normal',
      buffer: '',
      position: 0,
      lineNumber: 1,
      columnNumber: 1,
      stack: [],
      pendingElements: new Map(),
    };
  }

  /**
   * 解析输入内容
   */
  parse(content: string): void {
    if (this.destroyed) return;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      this.processCharacter(char);
    }

    // 处理待定元素
    this.processPendingElements();
  }

  /**
   * 处理单个字符
   */
  private processCharacter(char: string): void {
    this.state.buffer += char;

    // 更新位置信息
    if (char === '\n') {
      this.state.lineNumber++;
      this.state.columnNumber = 1;
    } else {
      this.state.columnNumber++;
    }

    // 根据当前模式处理
    switch (this.state.mode) {
      case 'normal':
        this.processNormalMode(char);
        break;
      case 'code_block':
        this.processCodeBlockMode(char);
        break;
      case 'inline_code':
        this.processInlineCodeMode(char);
        break;
      case 'link':
        this.processLinkMode(char);
        break;
      case 'emphasis':
        this.processEmphasisMode(char);
        break;
    }

    this.state.position++;
  }

  /**
   * 处理普通模式
   */
  private processNormalMode(char: string): void {
    const buffer = this.state.buffer;
    const isLineStart = this.state.columnNumber === 1 || buffer.slice(0, -1).endsWith('\n');

    switch (char) {
      case '#':
        if (isLineStart) {
          this.handleHeading();
        }
        break;

      case '*':
      case '_':
        if ((isLineStart && buffer.endsWith('* ')) || buffer.endsWith('- ')) {
          this.handleList();
        } else {
          this.handleEmphasis(char);
        }
        break;

      case '-':
        if (isLineStart) {
          if (buffer.match(/^-{3,}$/m)) {
            this.handleHorizontalRule();
          } else if (buffer.endsWith('- ')) {
            this.handleList();
          }
        }
        break;

      case '`':
        this.handleCode();
        break;

      case '>':
        if (isLineStart) {
          this.handleBlockquote();
        }
        break;

      case '[':
        this.handleLink();
        break;

      case '!':
        if (buffer.endsWith('![')) {
          this.handleImage();
        }
        break;

      case '\n':
        this.handleLineBreak();
        break;

      case '~':
        if (buffer.endsWith('~~')) {
          this.handleStrikethrough();
        }
        break;

      default:
        // 继续累积文本
        break;
    }
  }

  /**
   * 处理标题
   */
  private handleHeading(): void {
    const match = this.state.buffer.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      const startOffset = this.state.position - this.state.buffer.length + 1;

      this.emitEvent({
        type: ParseEventType.OPEN_TAG,
        elementType: MarkdownElementType.HEADING,
        attributes: { level },
        startOffset,
        endOffset: this.state.position,
      });

      this.state.stack.push(MarkdownElementType.HEADING);
      this.state.buffer = match[2]; // 保留标题内容
    }
  }

  /**
   * 处理强调（斜体/粗体）
   */
  private handleEmphasis(char: string): void {
    const buffer = this.state.buffer;
    const startOffset = this.state.position - buffer.length + 1;

    // 检查粗体
    if (buffer.endsWith(`${char}${char}`)) {
      // 创建待定元素
      this.createPendingElement(startOffset, [
        MarkdownElementType.STRONG,
        MarkdownElementType.TEXT,
      ]);
      this.state.mode = 'emphasis';
    }
    // 检查斜体
    else if (buffer.endsWith(char) && !buffer.endsWith(`\\${char}`)) {
      this.createPendingElement(startOffset, [
        MarkdownElementType.EMPHASIS,
        MarkdownElementType.TEXT,
      ]);
      this.state.mode = 'emphasis';
    }
  }

  /**
   * 处理代码
   */
  private handleCode(): void {
    const buffer = this.state.buffer;

    // 检查代码块
    if (buffer.endsWith('```')) {
      const startOffset = this.state.position - 2;
      this.emitEvent({
        type: ParseEventType.OPEN_TAG,
        elementType: MarkdownElementType.CODE_BLOCK,
        startOffset,
        endOffset: this.state.position,
      });
      this.state.mode = 'code_block';
      this.state.buffer = '';
    }
    // 检查行内代码
    else if (buffer.endsWith('`')) {
      const startOffset = this.state.position;
      this.emitEvent({
        type: ParseEventType.OPEN_TAG,
        elementType: MarkdownElementType.CODE,
        startOffset,
        endOffset: this.state.position,
        isTemporary: true,
      });
      this.state.mode = 'inline_code';
    }
  }

  /**
   * 处理其他模式...
   */
  private processCodeBlockMode(_char: string): void {
    if (this.state.buffer.endsWith('```')) {
      this.emitEvent({
        type: ParseEventType.CLOSE_TAG,
        elementType: MarkdownElementType.CODE_BLOCK,
        startOffset: this.state.position - 2,
        endOffset: this.state.position,
      });
      this.state.mode = 'normal';
      this.state.buffer = '';
    }
  }

  private processInlineCodeMode(char: string): void {
    if (char === '`' && !this.state.buffer.endsWith('\\`')) {
      this.emitEvent({
        type: ParseEventType.CLOSE_TAG,
        elementType: MarkdownElementType.CODE,
        startOffset: this.state.position,
        endOffset: this.state.position,
      });
      this.state.mode = 'normal';
      this.state.buffer = '';
    }
  }

  private processLinkMode(_char: string): void {
    // 简化的链接处理
    if (_char === ')' && this.state.buffer.includes('](')) {
      this.emitEvent({
        type: ParseEventType.CLOSE_TAG,
        elementType: MarkdownElementType.LINK,
        startOffset: this.state.position,
        endOffset: this.state.position,
      });
      this.state.mode = 'normal';
      this.state.buffer = '';
    }
  }

  private processEmphasisMode(char: string): void {
    // 处理强调结束
    const buffer = this.state.buffer;
    if ((char === '*' || char === '_') && !buffer.endsWith(`\\${char}`)) {
      const elementType =
        buffer.includes('**') || buffer.includes('__')
          ? MarkdownElementType.STRONG
          : MarkdownElementType.EMPHASIS;

      this.emitEvent({
        type: ParseEventType.CLOSE_TAG,
        elementType,
        startOffset: this.state.position,
        endOffset: this.state.position,
      });
      this.state.mode = 'normal';
      this.state.buffer = '';
    }
  }

  /**
   * 处理列表
   */
  private handleList(): void {
    this.emitEvent({
      type: ParseEventType.OPEN_TAG,
      elementType: MarkdownElementType.LIST_ITEM,
      startOffset: this.state.position - this.state.buffer.length + 1,
      endOffset: this.state.position,
    });
  }

  /**
   * 处理引用
   */
  private handleBlockquote(): void {
    this.emitEvent({
      type: ParseEventType.OPEN_TAG,
      elementType: MarkdownElementType.BLOCKQUOTE,
      startOffset: this.state.position - this.state.buffer.length + 1,
      endOffset: this.state.position,
    });
  }

  /**
   * 处理链接
   */
  private handleLink(): void {
    this.state.mode = 'link';
    this.emitEvent({
      type: ParseEventType.OPEN_TAG,
      elementType: MarkdownElementType.LINK,
      startOffset: this.state.position,
      endOffset: this.state.position,
      isTemporary: true,
    });
  }

  /**
   * 处理图片
   */
  private handleImage(): void {
    this.emitEvent({
      type: ParseEventType.OPEN_TAG,
      elementType: MarkdownElementType.IMAGE,
      startOffset: this.state.position - 1,
      endOffset: this.state.position,
      isTemporary: true,
    });
  }

  /**
   * 处理删除线
   */
  private handleStrikethrough(): void {
    this.emitEvent({
      type: ParseEventType.OPEN_TAG,
      elementType: MarkdownElementType.STRIKETHROUGH,
      startOffset: this.state.position - 1,
      endOffset: this.state.position,
      isTemporary: true,
    });
  }

  /**
   * 处理水平线
   */
  private handleHorizontalRule(): void {
    this.emitEvent({
      type: ParseEventType.SELF_CLOSING_TAG,
      elementType: MarkdownElementType.HORIZONTAL_RULE,
      startOffset: this.state.position - this.state.buffer.length + 1,
      endOffset: this.state.position,
    });
    this.state.buffer = '';
  }

  /**
   * 处理换行
   */
  private handleLineBreak(): void {
    // 检查是否需要关闭当前元素
    if (this.state.stack.length > 0) {
      const currentElement = this.state.stack[this.state.stack.length - 1];
      if (
        currentElement === MarkdownElementType.HEADING ||
        currentElement === MarkdownElementType.PARAGRAPH
      ) {
        this.emitEvent({
          type: ParseEventType.CLOSE_TAG,
          elementType: currentElement,
          startOffset: this.state.position,
          endOffset: this.state.position,
        });
        this.state.stack.pop();
      }
    }

    // 处理文本内容
    if (this.state.buffer.trim().length > 0 && this.state.mode === 'normal') {
      this.emitEvent({
        type: ParseEventType.TEXT,
        content: this.state.buffer.trim(),
        startOffset: this.state.position - this.state.buffer.length,
        endOffset: this.state.position - 1,
      });
    }

    this.state.buffer = '';
  }

  /**
   * 创建待定元素
   */
  private createPendingElement(startOffset: number, possibleTypes: MarkdownElementType[]): void {
    const elementId = this.eventIdCounter++;
    const pending: PendingElement = {
      startOffset,
      possibleTypes,
      confidence: new Map(),
      context: this.state.buffer,
      deadline: Date.now() + 100, // 100ms 超时
    };

    // 初始化置信度
    possibleTypes.forEach(type => {
      pending.confidence.set(type, 0.5);
    });

    this.state.pendingElements.set(elementId, pending);
  }

  /**
   * 处理待定元素
   */
  private processPendingElements(): void {
    const now = Date.now();
    const toRemove: number[] = [];

    this.state.pendingElements.forEach((pending, id) => {
      if (now > pending.deadline) {
        // 超时，选择置信度最高的类型
        let bestType = pending.possibleTypes[0];
        let bestConfidence = 0;

        pending.confidence.forEach((confidence, type) => {
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestType = type;
          }
        });

        this.emitEvent({
          type: ParseEventType.OPEN_TAG,
          elementType: bestType,
          startOffset: pending.startOffset,
          endOffset: this.state.position,
        });

        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.state.pendingElements.delete(id));
  }

  /**
   * 发送解析事件
   */
  private emitEvent(event: Omit<ParseEvent, 'type'> & { type: ParseEventType }): void {
    const fullEvent: ParseEvent = {
      ...event,
    };

    if (event.isTemporary) {
      this.tempEvents.set(this.eventIdCounter++, fullEvent);
    }

    this.eventBus.emit('parser:event', fullEvent);
  }

  /**
   * 结束解析
   */
  end(): void {
    if (this.destroyed) return;

    // 处理剩余的缓冲区内容
    if (this.state.buffer.trim().length > 0) {
      this.emitEvent({
        type: ParseEventType.TEXT,
        content: this.state.buffer.trim(),
        startOffset: this.state.position - this.state.buffer.length,
        endOffset: this.state.position,
      });
    }

    // 关闭所有未关闭的标签
    while (this.state.stack.length > 0) {
      const element = this.state.stack.pop()!;
      this.emitEvent({
        type: ParseEventType.CLOSE_TAG,
        elementType: element,
        startOffset: this.state.position,
        endOffset: this.state.position,
      });
    }

    // 处理所有待定元素
    this.state.pendingElements.forEach(pending => {
      const bestType = pending.possibleTypes[0];
      this.emitEvent({
        type: ParseEventType.CLOSE_TAG,
        elementType: bestType,
        startOffset: this.state.position,
        endOffset: this.state.position,
      });
    });

    this.state.pendingElements.clear();
  }

  /**
   * 销毁解析器
   */
  destroy(): void {
    this.destroyed = true;
    this.state = this.createInitialState();
    this.tempEvents.clear();
  }
}
