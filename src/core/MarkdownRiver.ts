/**
 * MarkdownRiver - 安全的 HTML 流式渲染器
 *
 * 解决 AI 流式输出 HTML 时的标签不完整问题，
 * 确保只渲染完整的 HTML 标签，避免闪烁。
 */
export class MarkdownRiver {
  private streamHtml: string = '';
  private safeHtml: string = '';
  private listeners: Array<(html: string) => void> = [];

  constructor() {
    // 简单构造函数，未来可扩展配置选项
  }

  /**
   * 注册 HTML 更新监听器
   * @param listener 监听器函数，接收安全的 HTML 字符串
   */
  onHtmlUpdate(listener: (html: string) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   * @param listener 要移除的监听器函数
   */
  offHtmlUpdate(listener: (html: string) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 触发所有监听器
   * @private
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.safeHtml);
      } catch (error) {
        console.error('MarkdownRiver listener error:', error);
      }
    });
  }

  /**
   * 写入 HTML 片段
   * @param chunk HTML 片段
   */
  write(chunk: string): void {
    // 追加到流式 HTML
    this.streamHtml += chunk;

    // 转换为安全的 HTML
    const newSafeHtml = this.convertToSafeHtml(this.streamHtml);

    // 只有当安全 HTML 发生变化时才通知监听器
    if (newSafeHtml !== this.safeHtml) {
      this.safeHtml = newSafeHtml;
      this.notifyListeners();
    }
  }

  /**
   * 获取当前的流式 HTML（可能包含不完整标签）
   */
  getStreamHtml(): string {
    return this.streamHtml;
  }

  /**
   * 获取当前的安全 HTML（已过滤不完整标签）
   */
  getSafeHtml(): string {
    return this.safeHtml;
  }

  /**
   * 重置状态并触发监听器
   */
  reset(): void {
    this.streamHtml = '';
    this.safeHtml = '';
    this.notifyListeners();
  }

  /**
   * 转换函数：过滤掉末尾不完整的标签
   * 策略：遇到末尾的 < 或 </ 时，默认推测为不完整标签并过滤，
   * 除非明确判断不可能是标签的情况下当作普通字符处理
   * @private
   */
  private convertToSafeHtml(html: string): string {
    if (!html) return '';

    // 先检查是否有未完成的 HTML 实体
    const lastAmpersand = html.lastIndexOf('&');
    if (lastAmpersand !== -1) {
      // 检查 & 后面是否有 ;
      const semicolonAfter = html.indexOf(';', lastAmpersand);
      if (semicolonAfter === -1) {
        // 没有找到结束的 ;，可能是未完成的实体
        const afterAmpersand = html.slice(lastAmpersand + 1);

        // 检查是否可能是有效的实体开始
        // 有效的实体格式：&name; 或 &#number;
        if (this.isPossibleEntity(afterAmpersand)) {
          // 等待更多输入
          return html.substring(0, lastAmpersand);
        }
        // 不是有效的实体格式，作为普通字符处理
      }
    }

    // 从末尾向前查找最后一个 < 符号
    const lastOpenBracket = html.lastIndexOf('<');

    // 如果没有 < 符号，整个内容都是安全的
    if (lastOpenBracket === -1) {
      return html;
    }

    // 检查这个 < 后面是否有对应的 >
    const hasClosingBracket = html.indexOf('>', lastOpenBracket) !== -1;

    // 如果有闭合的 >，说明标签是完整的
    if (hasClosingBracket) {
      return html;
    }

    // 获取 < 后面的内容
    const afterBracket = html.slice(lastOpenBracket + 1);

    // 检查 < 符号前的内容是否在代码块中
    const beforeBracket = html.substring(0, lastOpenBracket);
    if (this.isInCodeBlock(beforeBracket)) {
      // 在代码块中，< 默认是普通字符，除非它可能是结束标签的开始

      // 如果 < 在字符串末尾，需要等待下一个字符
      if (!afterBracket) {
        return html.substring(0, lastOpenBracket);
      }

      // 只有当 < 后面跟着 / 或可能的结束标签片段时，才需要特殊处理
      if (afterBracket.match(/^\/($|c($|o($|d($|e)?)?)?|p($|r($|e)?)?)$/)) {
        // 可能是 </code> 或 </pre> 的开始，等待更多输入
        return html.substring(0, lastOpenBracket);
      }

      // 其他情况下，< 是普通字符，保留它
      return html;
    }

    // === 例外情况：明确判断不可能是标签的情况 ===

    // 如果 < 后面不是字母或斜杠，说明不可能是 HTML 标签
    // 保留这些情况：
    // - 比较运算符：a < 5, x < 10
    // - 特殊字符：price < $50, a < !
    // - 空格：a < b（虽然 < div> 也有空格，但会被当作不完整标签过滤）
    if (afterBracket.match(/^[^a-zA-Z/]/)) {
      return html;
    }

    // === 默认策略：推测为不完整标签，直接过滤 ===

    // 如果到了这里，说明：
    // 1. 末尾有 < 符号
    // 2. 没有闭合的 >
    // 3. 不在代码块中
    // 4. 不是非法标签字符
    //
    // 默认认为这是不完整的标签，直接截断等待完整标签
    return html.substring(0, lastOpenBracket);
  }

  /**
   * 检查当前位置是否在代码块中
   * 注意：只有 <pre><code> 才是代码块，单独的 <code> 是内联代码
   * @private
   */
  private isInCodeBlock(html: string): boolean {
    // 查找所有的 <pre><code> 组合（代码块开始）
    const codeBlockStarts = html.match(/<pre[^>]*>\s*<code[^>]*>/g) || [];

    // 查找所有的 </code></pre> 组合（代码块结束）
    const codeBlockEnds = html.match(/<\/code>\s*<\/pre>/g) || [];

    // 如果代码块开始的数量大于结束的数量，说明当前在代码块中
    return codeBlockStarts.length > codeBlockEnds.length;
  }

  /**
   * 检查字符串是否可能是有效的 HTML 实体的一部分
   * @private
   */
  private isPossibleEntity(str: string): boolean {
    // 空字符串，可能是刚输入 &
    if (!str) return true;

    // 数字实体：&#60; &#x3C; 等
    if (str.startsWith('#')) {
      const rest = str.slice(1);
      if (!rest) return true; // 刚输入 &#

      // 十六进制
      if (rest.startsWith('x') || rest.startsWith('X')) {
        const hex = rest.slice(1);
        if (!hex) return true; // 刚输入 &#x
        return /^[0-9a-fA-F]+$/.test(hex);
      }

      // 十进制
      return /^[0-9]+$/.test(rest);
    }

    // 命名实体：&lt; &gt; &amp; 等
    // 只包含字母和数字
    return /^[a-zA-Z][a-zA-Z0-9]*$/.test(str);
  }
}
