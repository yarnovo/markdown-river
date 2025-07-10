import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../../../src/core/CacheManager';
import { EventEmitter } from '../../../src/events/EventEmitter';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let eventEmitter: EventEmitter;
  let eventHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    cacheManager = new CacheManager(eventEmitter);
    eventHandler = vi.fn();
  });

  describe('append', () => {
    it('should append chunk to content and emit event', () => {
      eventEmitter.on('cache:updated', eventHandler);

      cacheManager.append('Hello');
      expect(cacheManager.getContent()).toBe('Hello');
      expect(eventHandler).toHaveBeenCalledWith({ content: 'Hello' });

      cacheManager.append(' World');
      expect(cacheManager.getContent()).toBe('Hello World');
      expect(eventHandler).toHaveBeenCalledWith({ content: 'Hello World' });
      expect(eventHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('getContent', () => {
    it('should return current content', () => {
      expect(cacheManager.getContent()).toBe('');

      cacheManager.append('Test');
      expect(cacheManager.getContent()).toBe('Test');
    });
  });

  describe('reset', () => {
    it('should clear content', () => {
      cacheManager.append('Hello World');
      expect(cacheManager.getContent()).toBe('Hello World');

      cacheManager.reset();
      expect(cacheManager.getContent()).toBe('');
    });
  });
});
