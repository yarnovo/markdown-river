export interface ParseStrategy {
  /**
   * 处理内容并返回渲染策略
   * @param content 完整内容
   * @param lastParsedIndex 上次解析位置
   * @returns 安全解析位置（number）或处理后的内容（string）
   */
  process(content: string, lastParsedIndex: number): number | string;
}
