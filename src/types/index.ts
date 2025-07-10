import { MarkedOptions } from 'marked';

export type StreamState = 'idle' | 'streaming' | 'ended';

export interface MarkdownRiverOptions {
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
