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

    // 处理星号格式
    // 特殊情况：过滤单独的 * 或 **
    if (result === '*' || result === '**') {
      return '';
    }

    // 处理加粗格式 **text**
    const doubleStarMatches = result.match(/\*\*/g) || [];
    if (doubleStarMatches.length % 2 !== 0) {
      // 奇数个 **，需要处理
      if (result.startsWith('**')) {
        // 以 ** 开头的情况
        const afterOpening = result.substring(2);
        if (afterOpening.includes('**')) {
          // 已经闭合，不需要处理
          return result;
        } else if (afterOpening.length > 0) {
          if (afterOpening.endsWith('*')) {
            // **text* 的情况，暂时移除最后的 *，显示为加粗
            // 这样可以避免 marked 将其解析为 * + *text*
            return result.slice(0, -1) + '**';
          } else {
            // 有内容但没有闭合，补全
            return result + '**';
          }
        }
      } else {
        // ** 在中间的情况，找到最后一个未配对的 **
        const lastDoubleStarIndex = result.lastIndexOf('**');
        if (lastDoubleStarIndex !== -1) {
          const afterDoubleStar = result.substring(lastDoubleStarIndex + 2);
          if (afterDoubleStar.length > 0 && !afterDoubleStar.includes('**')) {
            // 有内容但没有闭合，补全
            return result + '**';
          }
        }
      }
    }

    // 处理斜体格式 *text*
    // 先排除 ** 的干扰
    const tempForStar = result.replace(/\*\*/g, '@@');
    const singleStarCount = (tempForStar.match(/\*/g) || []).length;

    if (singleStarCount % 2 !== 0) {
      // 奇数个单星号，需要处理
      // 找到最后一个未配对的 *
      let lastUnpairedIndex = -1;
      let pairCount = 0;

      for (let i = 0; i < result.length; i++) {
        if (result[i] === '*') {
          // 检查是否是 **
          if (i + 1 < result.length && result[i + 1] === '*') {
            i++; // 跳过 **
            continue;
          }
          if (i > 0 && result[i - 1] === '*') {
            continue; // 这是 ** 的第二个 *
          }

          // 这是单个 *
          pairCount++;
          if (pairCount % 2 === 1) {
            lastUnpairedIndex = i;
          }
        }
      }

      if (lastUnpairedIndex !== -1) {
        // 检查未配对的 * 后面是否有内容
        const afterStar = result.substring(lastUnpairedIndex + 1);
        if (afterStar.length > 0 && !afterStar.startsWith('*')) {
          // 有内容，补全闭合
          return result + '*';
        } else if (afterStar.length === 0 && lastUnpairedIndex === result.length - 1) {
          // * 在末尾且没有内容，过滤掉
          return result.slice(0, -1);
        }
      }
    }

    // 处理末尾单独的 * 或 **
    if (result.endsWith('*') && !result.endsWith('**') && result.length > 1) {
      // 检查这个 * 前面是否有配对的
      const beforeStar = result.slice(0, -1);
      const starCount = (beforeStar.match(/\*/g) || []).length;
      if (starCount % 2 === 0) {
        // 前面的星号都配对了，这个是多余的，过滤掉
        return beforeStar;
      }
    }

    if (result.endsWith('**') && result.length > 2) {
      // 检查这个 ** 前面是否有配对的
      const beforeStars = result.slice(0, -2);
      const doubleStarCount = (beforeStars.match(/\*\*/g) || []).length;
      if (doubleStarCount % 2 === 0) {
        // 前面的 ** 都配对了，这个是多余的，过滤掉
        return beforeStars;
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
