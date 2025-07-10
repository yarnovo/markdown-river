import { MarkedOptions } from 'marked';

export type StreamState = 'idle' | 'streaming' | 'ended';

export interface MarkdownRiverOptions {
  strategy?: ParseStrategy;
  markedOptions?: MarkedOptions;
}

export interface ParseStrategy {
  hasAmbiguity(content: string, lastParsedIndex: number): boolean;
  getSafeParseIndex(content: string, lastParsedIndex: number): number;
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
