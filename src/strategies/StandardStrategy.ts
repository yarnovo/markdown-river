import { ParseStrategy } from './ParseStrategy';

export class StandardStrategy implements ParseStrategy {
  hasAmbiguity(content: string, lastParsedIndex: number): boolean {
    const unparsed = content.slice(lastParsedIndex);

    // 空内容或纯文本没有歧义
    if (!unparsed || !/[*_`[\]!#~]/.test(unparsed)) {
      return false;
    }

    // 检查是否有未配对的格式标记
    let i = 0;

    while (i < unparsed.length) {
      const char = unparsed[i];
      const next = unparsed[i + 1];
      const prev = i > 0 ? unparsed[i - 1] : '';

      // 代码块特殊处理
      if (char === '`' && next === '`' && unparsed[i + 2] === '`') {
        // 三个反引号
        const codeBlockIndex = unparsed.indexOf('```', i + 3);
        if (codeBlockIndex === -1) {
          return true; // 未闭合的代码块
        }
        i = codeBlockIndex + 2;
      }
      // 内联代码
      else if (char === '`') {
        const closeIndex = unparsed.indexOf('`', i + 1);
        if (closeIndex === -1) {
          return true; // 未闭合的内联代码
        }
        i = closeIndex;
      }
      // 双星号（加粗）
      else if (char === '*' && next === '*') {
        const closeIndex = unparsed.indexOf('**', i + 2);
        if (closeIndex === -1) {
          return true; // 未闭合的加粗
        }
        i = closeIndex + 1;
      }
      // 单星号（斜体）
      else if (char === '*' && prev !== '*' && next !== '*') {
        const closeIndex = unparsed.indexOf('*', i + 1);
        if (closeIndex === -1 || unparsed[closeIndex - 1] === '*') {
          return true; // 未闭合的斜体
        }
        i = closeIndex;
      }
      // 删除线
      else if (char === '~' && next === '~') {
        const closeIndex = unparsed.indexOf('~~', i + 2);
        if (closeIndex === -1) {
          return true; // 未闭合的删除线
        }
        i = closeIndex + 1;
      }
      // 链接或图片
      else if (char === '[' || (char === '!' && next === '[')) {
        const startIndex = char === '!' ? i + 1 : i;
        const closeIndex = unparsed.indexOf(']', startIndex + 1);
        if (closeIndex === -1) {
          return true; // 未闭合的方括号
        }
        // 检查是否有链接部分
        if (unparsed[closeIndex + 1] === '(') {
          const parenClose = unparsed.indexOf(')', closeIndex + 2);
          if (parenClose === -1) {
            return true; // 未闭合的圆括号
          }
          i = parenClose;
        } else {
          i = closeIndex;
        }
      }

      i++;
    }

    return false;
  }

  getSafeParseIndex(content: string, lastParsedIndex: number): number {
    // 如果没有歧义，解析全部
    if (!this.hasAmbiguity(content, lastParsedIndex)) {
      return content.length;
    }

    // 当有歧义时，暂时不解析任何内容
    // 这是一个保守的策略，避免格式符号闪烁
    return lastParsedIndex;
  }
}
