import { CacheManager } from './CacheManager.js';
import { MarkdownParser } from './MarkdownParser.js';
import { MarkdownTransformer } from './MarkdownTransformer.js';
import { EventEmitter } from '../events/EventEmitter.js';
import { MarkdownRiverOptions } from '../types';
import { EventMap } from '../events/types';

export class MarkdownRiver {
  private cacheManager: CacheManager;
  private transformer: MarkdownTransformer;
  private parser: MarkdownParser;
  private eventEmitter: EventEmitter;
  private streamState: 'idle' | 'streaming' | 'ended' = 'idle';

  constructor(options: MarkdownRiverOptions = {}) {
    this.eventEmitter = new EventEmitter();
    this.cacheManager = new CacheManager(this.eventEmitter);
    this.transformer = new MarkdownTransformer();
    this.parser = new MarkdownParser(options.markedOptions);

    // 监听缓存更新事件
    this.eventEmitter.on('cache:updated', ({ content }) => {
      this.handleCacheUpdate(content);
    });
  }

  write(chunk: string): void {
    if (this.streamState === 'idle') {
      this.streamState = 'streaming';
      this.eventEmitter.emit('stream:start', undefined);
    }

    if (this.streamState === 'ended') {
      console.warn('Cannot write to ended stream');
      return;
    }

    // 缓存管理器会自动发送 cache:updated 事件
    this.cacheManager.append(chunk);
  }

  end(): void {
    if (this.streamState === 'ended') {
      return;
    }

    this.streamState = 'ended';
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

  private handleCacheUpdate(content: string): void {
    // 使用转换器处理内容，实现乐观更新
    const transformedContent = this.transformer.transform(content);

    // 解析转换后的内容
    const html = this.parser.parse(transformedContent);

    // 发送解析完成事件
    this.eventEmitter.emit('content:parsed', {
      html,
      content: transformedContent,
      timestamp: Date.now(),
    });
  }
}
