/**
 * 缓冲管理器 - 管理流式输入的缓冲和回溯
 *
 * 核心功能：
 * 1. 使用环形缓冲区避免内存无限增长
 * 2. 支持回溯操作，可以查看之前的内容
 * 3. 提供高效的读取和写入接口
 */

import { EventBus } from '../infrastructure/event-bus';
import {
  BufferWriteEventData,
  BufferReadEventData,
  BufferBacktrackEventData,
  BufferClearEventData,
} from '../types/buffer-events';

export interface BufferManagerOptions {
  /**
   * 缓冲区大小（字符数）
   * @default 8192
   */
  bufferSize?: number;

  /**
   * 事件总线实例
   */
  eventBus?: EventBus;
}

export interface BufferState {
  /**
   * 当前缓冲区内容长度
   */
  length: number;

  /**
   * 缓冲区总容量
   */
  capacity: number;

  /**
   * 已处理的字符总数
   */
  totalProcessed: number;

  /**
   * 当前读取位置
   */
  readPosition: number;

  /**
   * 当前写入位置
   */
  writePosition: number;
}

export class BufferManager {
  private buffer: string[];
  private capacity: number;
  private readPos: number = 0;
  private writePos: number = 0;
  private totalProcessed: number = 0;
  private eventBus?: EventBus;

  constructor(options: BufferManagerOptions = {}) {
    this.capacity = options.bufferSize || 8192;
    this.buffer = new Array(this.capacity).fill('');
    this.eventBus = options.eventBus;
  }

  /**
   * 写入数据到缓冲区
   * @param chunk 要写入的字符串块
   * @returns 实际写入的字符数
   */
  write(chunk: string): number {
    if (!chunk || chunk.length === 0) {
      return 0;
    }

    let written = 0;

    for (const char of chunk) {
      // 检查是否会覆盖未读数据
      if (this.available() >= this.capacity) {
        // 缓冲区满时，移动读取位置
        this.readPos++;
      }

      const writeIndex = this.writePos % this.capacity;
      this.buffer[writeIndex] = char;
      this.writePos++;
      written++;
    }

    this.eventBus?.emit<BufferWriteEventData>('buffer:write', {
      written,
      chunk: chunk.substring(0, written),
      timestamp: Date.now(),
      source: 'BufferManager',
    });

    return written;
  }

  /**
   * 从缓冲区读取数据
   * @param length 要读取的字符数，如果不指定则读取所有可用数据
   * @returns 读取到的字符串
   */
  read(length?: number): string {
    const available = this.available();
    const toRead = length === undefined ? available : Math.min(length, available);

    if (toRead === 0) {
      return '';
    }

    let result = '';
    for (let i = 0; i < toRead; i++) {
      const readIndex = (this.readPos + i) % this.capacity;
      result += this.buffer[readIndex];
    }

    this.readPos += toRead;
    this.totalProcessed += toRead;

    this.eventBus?.emit<BufferReadEventData>('buffer:read', {
      read: toRead,
      content: result,
      timestamp: Date.now(),
      source: 'BufferManager',
    });

    return result;
  }

  /**
   * 查看缓冲区内容但不消费
   * @param offset 相对于当前读取位置的偏移量
   * @param length 要查看的字符数
   * @returns 查看到的字符串
   */
  peek(offset: number = 0, length: number = 1): string {
    const available = this.available();
    if (offset >= available || offset < 0) {
      return '';
    }

    const maxLength = Math.min(length, available - offset);
    let result = '';

    for (let i = 0; i < maxLength; i++) {
      const peekIndex = (this.readPos + offset + i) % this.capacity;
      result += this.buffer[peekIndex];
    }

    return result;
  }

  /**
   * 回溯读取位置
   * @param count 要回溯的字符数
   * @returns 实际回溯的字符数
   */
  backtrack(count: number): number {
    if (count <= 0) {
      return 0;
    }

    // 计算可以回溯的最大字符数
    const maxBacktrack = Math.min(count, this.totalProcessed, this.capacity - this.available());
    this.readPos -= maxBacktrack;
    this.totalProcessed -= maxBacktrack;

    if (this.readPos < 0) {
      this.readPos += this.capacity;
    }

    this.eventBus?.emit<BufferBacktrackEventData>('buffer:backtrack', {
      backtracked: maxBacktrack,
      timestamp: Date.now(),
      source: 'BufferManager',
    });

    return maxBacktrack;
  }

  /**
   * 获取缓冲区中可用的字符数
   */
  available(): number {
    return this.writePos - this.readPos;
  }

  /**
   * 检查缓冲区是否已满
   */
  isFull(): boolean {
    return this.available() >= this.capacity;
  }

  /**
   * 检查缓冲区是否为空
   */
  isEmpty(): boolean {
    return this.available() === 0;
  }

  /**
   * 获取缓冲区状态
   */
  getState(): BufferState {
    return {
      length: this.available(),
      capacity: this.capacity,
      totalProcessed: this.totalProcessed,
      readPosition: this.readPos,
      writePosition: this.writePos,
    };
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.readPos = 0;
    this.writePos = 0;
    this.totalProcessed = 0;
    this.buffer.fill('');

    this.eventBus?.emit<BufferClearEventData>('buffer:clear', {
      timestamp: Date.now(),
      source: 'BufferManager',
    });
  }
}
