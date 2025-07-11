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

    // 从末尾向前查找最后一个 < 符号
    const lastOpenBracket = html.lastIndexOf('<');

    // 如果没有 < 符号，整个内容都是安全的
    if (lastOpenBracket === -1) {
      return html;
    }

    // 如果在代码块中，< 是普通字符，不需要处理
    if (this.isInCodeBlock(html)) {
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
   * @private
   */
  private isInCodeBlock(html: string): boolean {
    // 统计 <code> 和 </code> 标签的数量
    const codeOpens = (html.match(/<code[^>]*>/g) || []).length;
    const codeCloses = (html.match(/<\/code>/g) || []).length;

    // 如果开启标签比关闭标签多，说明在代码块中
    return codeOpens > codeCloses;
  }
}
