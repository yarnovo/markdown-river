import { CacheManager } from './CacheManager';
import { MarkdownParser } from './MarkdownParser';
import { EventEmitter } from '../events/EventEmitter';
import { StandardStrategy, ParseStrategy } from '../strategies';
import { MarkdownRiverOptions } from '../types';
import { EventMap } from '../events/types';

export class MarkdownRiver {
  private cacheManager: CacheManager;
  private strategy: ParseStrategy;
  private parser: MarkdownParser;
  private eventEmitter: EventEmitter;

  constructor(options: MarkdownRiverOptions = {}) {
    this.cacheManager = new CacheManager();
    this.eventEmitter = new EventEmitter();
    this.parser = new MarkdownParser(options.markedOptions);

    // 初始化策略
    this.strategy = options.strategy || new StandardStrategy();
  }

  write(chunk: string): void {
    if (this.cacheManager.getStreamState() === 'idle') {
      this.cacheManager.setStreamState('streaming');
      this.eventEmitter.emit('stream:start', undefined);
    }

    if (this.cacheManager.getStreamState() === 'ended') {
      console.warn('Cannot write to ended stream');
      return;
    }

    this.cacheManager.append(chunk);
    this.tryParse();
  }

  end(): void {
    if (this.cacheManager.getStreamState() === 'ended') {
      return;
    }

    this.cacheManager.setStreamState('ended');

    // 强制解析所有剩余内容
    const unparsedContent = this.cacheManager.getUnparsedContent();
    if (unparsedContent) {
      const html = this.parser.parse(this.cacheManager.getFullContent());
      this.cacheManager.updateParsedIndex(this.cacheManager.getFullContent().length);

      this.eventEmitter.emit('content:parsed', {
        html,
        content: unparsedContent,
        timestamp: Date.now(),
      });
    }

    this.eventEmitter.emit('stream:end', undefined);
  }

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.eventEmitter.off(event, handler);
  }

  destroy(): void {
    this.end();
    this.eventEmitter.clear();
    this.cacheManager.reset();
  }

  private tryParse(): void {
    const fullContent = this.cacheManager.getFullContent();
    const lastParsedIndex = this.cacheManager.getLastParsedIndex();

    // 检查是否有歧义
    const hasAmbiguity = this.strategy.hasAmbiguity(fullContent, lastParsedIndex);

    if (!hasAmbiguity) {
      // 无歧义，解析所有未处理内容
      this.parseAndEmit(fullContent.length);
    } else {
      // 有歧义，尝试找到安全解析位置
      const safeIndex = this.strategy.getSafeParseIndex(fullContent, lastParsedIndex);
      if (safeIndex > lastParsedIndex) {
        this.parseAndEmit(safeIndex);
      }
    }
  }

  private parseAndEmit(toIndex: number): void {
    const lastParsedIndex = this.cacheManager.getLastParsedIndex();
    if (toIndex <= lastParsedIndex) {
      return;
    }

    const fullContent = this.cacheManager.getFullContent();
    const contentToParse = fullContent.slice(0, toIndex);
    const newContent = fullContent.slice(lastParsedIndex, toIndex);

    // 解析完整内容以保持上下文
    const html = this.parser.parse(contentToParse);

    this.cacheManager.updateParsedIndex(toIndex);

    this.eventEmitter.emit('content:parsed', {
      html,
      content: newContent,
      timestamp: Date.now(),
    });

    // 如果还有未解析内容，发送缓冲状态
    if (toIndex < fullContent.length) {
      this.eventEmitter.emit('buffer:status', {
        state: 'buffering',
        size: fullContent.length - toIndex,
        reason: 'Ambiguity detected',
      });
    }
  }
}
