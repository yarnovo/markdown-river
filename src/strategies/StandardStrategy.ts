import { ParseStrategy } from './ParseStrategy';

export class StandardStrategy implements ParseStrategy {
  process(content: string, lastParsedIndex: number): number | string {
    const unparsed = content.slice(lastParsedIndex);

    // 如果没有未解析内容，返回当前位置
    if (!unparsed) {
      return lastParsedIndex;
    }

    // 1. 处理列表特殊情况
    if (unparsed.startsWith('-')) {
      if (unparsed.length === 1) {
        // 单独的横杠，直接渲染
        return content.length;
      }
      if (unparsed.startsWith('- ') && unparsed.length === 2) {
        // 横杠+空格，不渲染，保持上一个位置
        return lastParsedIndex;
      }
      // 其他情况正常处理
    }

    // 检查并处理行内元素的乐观更新
    let firstUnmatchedIndex = -1;
    let unmatchedType = '';
    let unmatchedSymbol = '';

    // 扫描未解析内容，找到第一个未匹配的格式符号
    for (let i = 0; i < unparsed.length; i++) {
      const char = unparsed[i];
      const nextChar = unparsed[i + 1];

      // 2. 行内代码（排除代码块）
      if (char === '`' && !unparsed.slice(i).startsWith('```')) {
        // 检查是否有闭合的反引号
        const restContent = unparsed.slice(i + 1);
        const closeIndex = restContent.indexOf('`');
        if (closeIndex === -1) {
          firstUnmatchedIndex = i;
          unmatchedType = 'code';
          unmatchedSymbol = '`';
          break;
        } else {
          // 跳过到闭合符号之后
          i = i + 1 + closeIndex;
        }
      }

      // 3. 强调和斜体
      else if (char === '*' || char === '_') {
        // 检查是否是双符号
        const isDouble = nextChar === char;
        const symbol = isDouble ? char + char : char;
        const searchStart = i + symbol.length;

        // 查找闭合符号
        const restContent = unparsed.slice(searchStart);
        const closeIndex = restContent.indexOf(symbol);
        if (closeIndex === -1) {
          firstUnmatchedIndex = i;
          unmatchedType = isDouble ? 'strong' : 'em';
          unmatchedSymbol = symbol;
          break;
        } else {
          // 跳过到闭合符号之后
          i = searchStart + closeIndex + symbol.length - 1;
        }
      }

      // 4. 链接
      else if (char === '[') {
        // 检查是否有完整的链接语法
        const remainingText = unparsed.slice(i);
        const linkMatch = remainingText.match(/^\[([^\]]*)\]\(([^)]*)\)/);
        if (!linkMatch) {
          firstUnmatchedIndex = i;
          unmatchedType = 'link';
          unmatchedSymbol = '[';
          break;
        } else {
          // 跳过整个链接
          i = i + linkMatch[0].length - 1;
        }
      }
    }

    // 如果没有找到未匹配的格式符号，可以解析到最后
    if (firstUnmatchedIndex === -1) {
      return content.length;
    }

    // 获取符号位置的绝对索引
    const symbolAbsoluteIndex = lastParsedIndex + firstUnmatchedIndex;

    // 检查符号后面是否有内容
    const afterSymbolIndex = symbolAbsoluteIndex + unmatchedSymbol.length;
    const afterSymbolContent = content.slice(afterSymbolIndex);

    if (!afterSymbolContent) {
      // 符号后面没有内容，解析到符号前或保持当前位置
      return firstUnmatchedIndex > 0 ? symbolAbsoluteIndex : lastParsedIndex;
    }

    // 复杂场景：如果前面有完整的格式化内容，优先解析完整部分
    if (firstUnmatchedIndex > 0) {
      const beforeSymbol = unparsed.slice(0, firstUnmatchedIndex);
      // 检查是否包含完整的格式（如 *hello* 这样的完整格式）
      const hasCompleteFormat = /\*[^*]+\*|`[^`]+`|\[[^\]]*\]\([^)]*\)/.test(beforeSymbol);
      if (hasCompleteFormat) {
        // 前面有完整的格式，优先解析到符号前
        return symbolAbsoluteIndex;
      }
    }

    // 符号后面有内容，进行乐观更新：自动补全闭合标签
    switch (unmatchedType) {
      case 'code': {
        // 找到反引号后的内容，直到遇到空格、换行或其他符号
        const codeContent = afterSymbolContent.split(/[\s`]/)[0];
        return content.slice(0, afterSymbolIndex) + codeContent + '`';
      }

      case 'em': {
        const emContent = afterSymbolContent.split(/[\s*_]/)[0];
        return content.slice(0, afterSymbolIndex) + emContent + unmatchedSymbol;
      }

      case 'strong': {
        const strongContent = afterSymbolContent.split(/[\s*_]/)[0];
        return content.slice(0, afterSymbolIndex) + strongContent + unmatchedSymbol;
      }

      case 'link': {
        // 处理链接的乐观更新
        const linkContent = afterSymbolContent.split(/[\]\s]/)[0];
        return content.slice(0, afterSymbolIndex) + linkContent + ']()';
      }

      default:
        return symbolAbsoluteIndex;
    }
  }
}
