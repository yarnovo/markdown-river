import { StreamState } from '../types';

export class CacheManager {
  private content: string = '';
  private lastParsedIndex: number = 0;
  private streamState: StreamState = 'idle';

  append(chunk: string): void {
    this.content += chunk;
  }

  getFullContent(): string {
    return this.content;
  }

  getUnparsedContent(): string {
    return this.content.slice(this.lastParsedIndex);
  }

  getParsedContent(): string {
    return this.content.slice(0, this.lastParsedIndex);
  }

  updateParsedIndex(index: number): void {
    this.lastParsedIndex = index;
  }

  getLastParsedIndex(): number {
    return this.lastParsedIndex;
  }

  setStreamState(state: StreamState): void {
    this.streamState = state;
  }

  getStreamState(): StreamState {
    return this.streamState;
  }

  reset(): void {
    this.content = '';
    this.lastParsedIndex = 0;
    this.streamState = 'idle';
  }
}
