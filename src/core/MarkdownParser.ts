import { marked, MarkedOptions } from 'marked';

export class MarkdownParser {
  private options: MarkedOptions;

  constructor(options: MarkedOptions = {}) {
    this.options = {
      breaks: true,
      gfm: true,
      ...options,
    };
    this.configure(this.options);
  }

  parse(content: string): string {
    try {
      return marked(content, this.options) as string;
    } catch (error) {
      // 降级处理：返回纯文本包裹在 pre 标签中
      console.error('Markdown parsing error:', error);
      return `<pre>${this.escapeHtml(content)}</pre>`;
    }
  }

  configure(options: MarkedOptions): void {
    this.options = { ...this.options, ...options };
    marked.setOptions(this.options);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
