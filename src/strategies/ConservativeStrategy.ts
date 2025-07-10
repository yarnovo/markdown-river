import { ParseStrategy } from './ParseStrategy';

export class ConservativeStrategy implements ParseStrategy {
  hasAmbiguity(content: string, lastParsedIndex: number): boolean {
    const unparsed = content.slice(lastParsedIndex);

    // 更保守的策略：任何格式符号都视为潜在歧义
    return /[*_`[\]!#>~-]/.test(unparsed);
  }

  getSafeParseIndex(content: string, lastParsedIndex: number): number {
    // 如果没有歧义，解析全部
    if (!this.hasAmbiguity(content, lastParsedIndex)) {
      return content.length;
    }

    // 保守策略：有任何歧义就暂停解析
    // 等待更多内容或明确的边界（如换行符）
    return lastParsedIndex;
  }
}
