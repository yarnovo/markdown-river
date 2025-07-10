export interface ParseStrategy {
  hasAmbiguity(content: string, lastParsedIndex: number): boolean;
  getSafeParseIndex(content: string, lastParsedIndex: number): number;
}
