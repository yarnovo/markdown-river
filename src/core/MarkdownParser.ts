import { MarkedOptions, Marked } from 'marked';

export class MarkdownParser {
  private options: MarkedOptions;
  private markedInstance: Marked;

  constructor(options: MarkedOptions = {}) {
    this.options = {
      breaks: true,
      gfm: true,
      ...options,
    };
    this.markedInstance = new Marked();
    this.markedInstance.setOptions(this.options);
  }

  parse(content: string): string {
    try {
      return this.markedInstance.parse(content) as string;
    } catch (error) {
      // 降级处理：返回纯文本包裹在 pre 标签中
      console.error('Markdown parsing error:', error);
      return `<pre>${this.escapeHtml(content)}</pre>`;
    }
  }

  configure(options: MarkedOptions): void {
    this.options = { ...this.options, ...options };
    this.markedInstance.setOptions(this.options);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
