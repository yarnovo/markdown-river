import { EventBus } from './EventBus.js';

interface BufferOptions {
  timeout: number;
}

interface BufferDecision {
  shouldFlush: boolean;
  confidence: number;
  reason: string;
}

export class InputBuffer {
  private buffer = '';
  private eventBus: EventBus;
  private options: BufferOptions;
  private timer: NodeJS.Timeout | null = null;
  private lastFlushTime = Date.now();
  private destroyed = false;

  // 歧义字符及其上下文模式
  private ambiguousPatterns: Record<
    string,
    { patterns: Array<{ regex: RegExp; type: string; confidence: number }> }
  > = {
    '*': {
      patterns: [
        { regex: /^\*\s/, type: 'list', confidence: 0.9 },
        { regex: /\*\*/, type: 'bold', confidence: 0.85 },
        { regex: /\*[^\s*]+\*/, type: 'italic', confidence: 0.8 },
        { regex: /\d+\s*\*\s*\d+/, type: 'math', confidence: 0.7 },
      ],
    },
    _: {
      patterns: [
        { regex: /__/, type: 'bold', confidence: 0.85 },
        { regex: /_[^\s_]+_/, type: 'italic', confidence: 0.8 },
      ],
    },
    '`': {
      patterns: [
        { regex: /```/, type: 'code_block', confidence: 0.95 },
        { regex: /`[^`]+`/, type: 'inline_code', confidence: 0.9 },
      ],
    },
    '#': {
      patterns: [
        { regex: /^#{1,6}\s/, type: 'heading', confidence: 0.95 },
        { regex: /#[^\s#]/, type: 'tag', confidence: 0.6 },
      ],
    },
    '>': {
      patterns: [{ regex: /^>\s/, type: 'blockquote', confidence: 0.9 }],
    },
    '[': {
      patterns: [
        { regex: /\[[^\]]*\]\([^)]*\)/, type: 'link', confidence: 0.9 },
        { regex: /\[[^\]]*\]/, type: 'reference', confidence: 0.7 },
      ],
    },
    '!': {
      patterns: [{ regex: /!\[[^\]]*\]\([^)]*\)/, type: 'image', confidence: 0.95 }],
    },
    '-': {
      patterns: [
        { regex: /^-\s/, type: 'list', confidence: 0.9 },
        { regex: /^---+$/, type: 'hr', confidence: 0.95 },
        { regex: /--/, type: 'dash', confidence: 0.5 },
      ],
    },
  };

  constructor(eventBus: EventBus, options: BufferOptions) {
    this.eventBus = eventBus;
    this.options = options;
  }

  /**
   * 写入字符
   */
  write(chunk: string): void {
    if (this.destroyed) return;

    this.buffer += chunk;

    // 分析是否应该立即释放
    const decision = this.analyzeBuffer();

    if (decision.shouldFlush) {
      this.flush();
    } else {
      this.resetTimer();
    }
  }

  /**
   * 分析缓冲区内容，决定是否释放
   */
  private analyzeBuffer(): BufferDecision {
    if (this.buffer.length === 0) {
      return { shouldFlush: false, confidence: 0, reason: 'empty buffer' };
    }

    // 检查是否有完整的行
    if (this.buffer.includes('\n')) {
      return { shouldFlush: true, confidence: 1, reason: 'complete line' };
    }

    // 检查是否有明确的块结束标记
    const blockEndPatterns = [
      /```$/, // 代码块结束
      /\)\s*$/, // 链接或图片结束
      /\*\*$/, // 粗体结束
      /__$/, // 粗体结束（下划线）
      /\*$/, // 斜体结束
      /_$/, // 斜体结束（下划线）
      /`$/, // 行内代码结束
      /~~$/, // 删除线结束
    ];

    for (const pattern of blockEndPatterns) {
      if (pattern.test(this.buffer)) {
        // 检查是否真的是结束标记
        const lastChar = this.buffer[this.buffer.length - 1];
        const context = this.getContext(lastChar);
        if (context.confidence > 0.8) {
          return { shouldFlush: true, confidence: context.confidence, reason: 'block end' };
        }
      }
    }

    // 检查歧义字符
    const lastChar = this.buffer[this.buffer.length - 1];
    if (this.ambiguousPatterns[lastChar]) {
      const context = this.getContext(lastChar);
      if (context.confidence < 0.7) {
        // 置信度低，等待更多输入
        return {
          shouldFlush: false,
          confidence: context.confidence,
          reason: 'ambiguous character',
        };
      }
    }

    // 检查缓冲区大小
    if (this.buffer.length > 100) {
      return { shouldFlush: true, confidence: 0.8, reason: 'buffer size limit' };
    }

    // 检查时间
    const timeSinceLastFlush = Date.now() - this.lastFlushTime;
    if (timeSinceLastFlush > this.options.timeout * 2) {
      return { shouldFlush: true, confidence: 0.7, reason: 'timeout' };
    }

    return { shouldFlush: false, confidence: 0.5, reason: 'waiting for more input' };
  }

  /**
   * 获取字符的上下文信息
   */
  private getContext(char: string): { type: string; confidence: number } {
    const patterns = this.ambiguousPatterns[char];
    if (!patterns) {
      return { type: 'unknown', confidence: 1 };
    }

    let bestMatch = { type: 'unknown', confidence: 0 };

    for (const pattern of patterns.patterns) {
      if (pattern.regex.test(this.buffer)) {
        if (pattern.confidence > bestMatch.confidence) {
          bestMatch = { type: pattern.type, confidence: pattern.confidence };
        }
      }
    }

    return bestMatch;
  }

  /**
   * 重置定时器
   */
  private resetTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.options.timeout);
  }

  /**
   * 立即释放缓冲区内容
   */
  flush(): void {
    if (this.destroyed || this.buffer.length === 0) return;

    const content = this.buffer;
    this.buffer = '';
    this.lastFlushTime = Date.now();

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.eventBus.emit('buffer:flush', { content });
  }

  /**
   * 销毁缓冲器
   */
  destroy(): void {
    this.destroyed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.buffer = '';
  }
}
