import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from '../../../src/core/CacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
  });

  describe('append', () => {
    it('should append chunk to content', () => {
      cacheManager.append('Hello');
      expect(cacheManager.getFullContent()).toBe('Hello');

      cacheManager.append(' World');
      expect(cacheManager.getFullContent()).toBe('Hello World');
    });
  });

  describe('getUnparsedContent', () => {
    it('should return unparsed content', () => {
      cacheManager.append('Hello World');
      expect(cacheManager.getUnparsedContent()).toBe('Hello World');

      cacheManager.updateParsedIndex(5);
      expect(cacheManager.getUnparsedContent()).toBe(' World');
    });
  });

  describe('getParsedContent', () => {
    it('should return parsed content', () => {
      cacheManager.append('Hello World');
      expect(cacheManager.getParsedContent()).toBe('');

      cacheManager.updateParsedIndex(5);
      expect(cacheManager.getParsedContent()).toBe('Hello');
    });
  });

  describe('stream state', () => {
    it('should manage stream state correctly', () => {
      expect(cacheManager.getStreamState()).toBe('idle');

      cacheManager.setStreamState('streaming');
      expect(cacheManager.getStreamState()).toBe('streaming');

      cacheManager.setStreamState('ended');
      expect(cacheManager.getStreamState()).toBe('ended');
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      cacheManager.append('Hello World');
      cacheManager.updateParsedIndex(5);
      cacheManager.setStreamState('streaming');

      cacheManager.reset();

      expect(cacheManager.getFullContent()).toBe('');
      expect(cacheManager.getLastParsedIndex()).toBe(0);
      expect(cacheManager.getStreamState()).toBe('idle');
    });
  });
});
