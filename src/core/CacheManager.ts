import { EventEmitter } from '../events/EventEmitter.js';

export class CacheManager {
  private content: string = '';
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  append(chunk: string): void {
    this.content += chunk;
    // 添加内容后立即发送事件
    this.eventEmitter.emit('cache:updated', { content: this.content });
  }

  getContent(): string {
    return this.content;
  }

  reset(): void {
    this.content = '';
  }
}
