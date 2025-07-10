import { ParsedContent, BufferStatus } from '../types';

export type EventMap = {
  'content:parsed': ParsedContent;
  'buffer:status': BufferStatus;
  'stream:start': void;
  'stream:end': void;
  'cache:updated': { content: string };
  error: Error;
};
