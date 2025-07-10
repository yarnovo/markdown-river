/**
 * Markdown 语法转换器
 * 负责对流式输入的内容进行乐观转换
 */
export class MarkdownTransformer {
  /**
   * 转换规则：
   * 1. 单独的格式符号 -> 过滤掉
   * 2. 格式符号 + 内容但无闭合 -> 自动补全闭合
   */
  transform(content: string): string {
    let result = content;

    // 处理行内代码 `
    const backtickCount = (result.match(/`/g) || []).length;
    if (backtickCount % 2 !== 0) {
      // 奇数个反引号
      if (result.endsWith('`')) {
        // 单独的反引号，过滤掉
        result = result.slice(0, -1);
      } else {
        // 有内容的未闭合反引号，补全
        result = result + '`';
      }
    }

    // 处理加粗 **
    const doubleStarMatches = result.match(/\*\*/g) || [];
    if (doubleStarMatches.length % 2 !== 0) {
      // 奇数个 **
      if (result.endsWith('**')) {
        // 单独的 **，过滤掉
        result = result.slice(0, -2);
      } else {
        // 有内容的未闭合 **，补全
        result = result + '**';
      }
    }

    // 处理斜体 *（需要排除 ** 的影响）
    // 先临时替换掉所有的 **
    const tempResult = result.replace(/\*\*/g, '@@');
    const singleStarCount = (tempResult.match(/\*/g) || []).length;
    if (singleStarCount % 2 !== 0) {
      // 奇数个单星号
      if (result.endsWith('*') && !result.endsWith('**') && !result.endsWith('***')) {
        // 单独的星号，过滤掉
        result = result.slice(0, -1);
      } else if (!result.endsWith('**')) {
        // 有内容的未闭合星号，补全
        result = result + '*';
      }
    }

    // 处理链接 []
    const openBrackets = (result.match(/\[/g) || []).length;
    const closeBrackets = (result.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      // 有未闭合的方括号
      if (result.endsWith('[')) {
        // 单独的方括号，过滤掉
        result = result.slice(0, -1);
      } else {
        // 有内容的未闭合链接，补全
        result = result + ']()';
      }
    }

    // 处理双下划线 __
    const doubleUnderscoreMatches = result.match(/__/g) || [];
    if (doubleUnderscoreMatches.length % 2 !== 0) {
      // 奇数个 __
      if (result.endsWith('__')) {
        // 单独的 __，过滤掉
        result = result.slice(0, -2);
      } else {
        // 有内容的未闭合 __，补全
        result = result + '__';
      }
    }

    // 处理单下划线 _（需要排除 __ 的影响）
    // 先临时替换掉所有的 __
    const tempResult2 = result.replace(/__/g, '@@');
    const singleUnderscoreCount = (tempResult2.match(/_/g) || []).length;
    if (singleUnderscoreCount % 2 !== 0) {
      // 奇数个单下划线
      if (result.endsWith('_') && !result.endsWith('__')) {
        // 单独的下划线，过滤掉
        result = result.slice(0, -1);
      } else if (!result.endsWith('__')) {
        // 有内容的未闭合下划线，补全
        result = result + '_';
      }
    }

    return result;
  }
}
