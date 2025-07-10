import { MarkedOptions } from 'marked';
import { ParseStrategy } from '../strategies/ParseStrategy';

export type StreamState = 'idle' | 'streaming' | 'ended';

export { ParseStrategy };

export interface MarkdownRiverOptions {
  strategy?: ParseStrategy;
  markedOptions?: MarkedOptions;
}

export interface ParsedContent {
  html: string;
  content: string;
  timestamp: number;
}

export interface BufferStatus {
  state: 'buffering' | 'flushing';
  size: number;
  reason: string;
}
