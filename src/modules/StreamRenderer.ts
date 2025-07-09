import { EventBus } from './EventBus.js';
import { ParseEvent, ParseEventType, MarkdownElementType } from '../types/index.js';

interface RendererOptions {
  syntaxHighlight: boolean;
  virtualScroll: boolean;
}

interface ElementInfo {
  element: HTMLElement;
  type: MarkdownElementType;
  temporary?: boolean;
}

export class StreamRenderer {
  private container: HTMLElement;
  private eventBus: EventBus;
  private options: RendererOptions;
  private elementMap: Map<number, ElementInfo> = new Map();
  private elementStack: HTMLElement[] = [];
  private currentParent: HTMLElement;
  private pendingTextContent = '';
  private destroyed = false;
  private elementPool: Map<string, HTMLElement[]> = new Map();

  constructor(container: HTMLElement, eventBus: EventBus, options: RendererOptions) {
    this.container = container;
    this.eventBus = eventBus;
    this.options = options;
    this.currentParent = container;

    // 清空容器
    container.innerHTML = '';

    // 设置容器样式
    this.setupContainerStyles();
  }

  private setupContainerStyles(): void {
    this.container.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    this.container.style.lineHeight = '1.6';
    this.container.style.color = '#24292e';
    this.container.style.wordWrap = 'break-word';
  }

  /**
   * 渲染解析事件
   */
  render(events: ParseEvent[]): void {
    if (this.destroyed) return;

    // 重置渲染状态，确保每次 render 都是独立的
    this.elementStack = [];
    this.currentParent = this.container;
    this.pendingTextContent = '';

    const fragment = document.createDocumentFragment();

    for (const event of events) {
      this.processEvent(event, fragment);
    }

    // 批量更新 DOM
    if (fragment.childNodes.length > 0) {
      // 总是添加到容器，而不是当前父元素
      this.container.appendChild(fragment);
    }

    // 发送渲染完成事件
    this.eventBus.emit('renderer:complete', { count: events.length });
  }

  /**
   * 处理单个事件
   */
  private processEvent(event: ParseEvent, fragment: DocumentFragment): void {
    switch (event.type) {
      case ParseEventType.OPEN_TAG:
        this.handleOpenTag(event, fragment);
        break;
      case ParseEventType.CLOSE_TAG:
        this.handleCloseTag(event);
        break;
      case ParseEventType.SELF_CLOSING_TAG:
        this.handleSelfClosingTag(event, fragment);
        break;
      case ParseEventType.TEXT:
        this.handleText(event);
        break;
      case ParseEventType.REVISION:
        this.handleRevision(event);
        break;
    }
  }

  /**
   * 处理开始标签
   */
  private handleOpenTag(event: ParseEvent, fragment: DocumentFragment): void {
    const element = this.createElement(event.elementType!, event.attributes);

    if (event.isTemporary) {
      element.classList.add('md-temporary');
    }

    // 如果有待处理的文本，先添加
    if (this.pendingTextContent) {
      const textNode = document.createTextNode(this.pendingTextContent);
      this.currentParent.appendChild(textNode);
      this.pendingTextContent = '';
    }

    // 添加元素到当前父元素
    if (this.currentParent === this.container) {
      // 如果当前父元素是容器，添加到 fragment
      fragment.appendChild(element);
    } else {
      // 否则添加到当前父元素
      this.currentParent.appendChild(element);
    }

    // 更新栈
    this.elementStack.push(element);
    this.currentParent = element;

    // 保存元素信息
    this.elementMap.set(event.startOffset, {
      element,
      type: event.elementType!,
      temporary: event.isTemporary,
    });
  }

  /**
   * 处理结束标签
   */
  private handleCloseTag(_event: ParseEvent): void {
    // 如果有待处理的文本，先添加
    if (this.pendingTextContent) {
      const textNode = document.createTextNode(this.pendingTextContent);
      // 文本总是添加到当前父元素
      this.currentParent.appendChild(textNode);
      this.pendingTextContent = '';
    }

    // 从栈中弹出
    if (this.elementStack.length > 0) {
      this.elementStack.pop();
      this.currentParent = this.elementStack[this.elementStack.length - 1] || this.container;
    }
  }

  /**
   * 处理自闭合标签
   */
  private handleSelfClosingTag(event: ParseEvent, fragment: DocumentFragment): void {
    const element = this.createElement(event.elementType!, event.attributes);

    if (this.currentParent === this.container) {
      fragment.appendChild(element);
    } else {
      this.currentParent.appendChild(element);
    }
  }

  /**
   * 处理文本内容
   */
  private handleText(_event: ParseEvent): void {
    if (_event.content) {
      this.pendingTextContent += _event.content;
    }
  }

  /**
   * 处理修正事件
   */
  private handleRevision(event: ParseEvent): void {
    if (!event.revisionOf) return;

    const originalInfo = this.elementMap.get(event.revisionOf);
    if (!originalInfo) return;

    // 创建新元素
    const newElement = this.createElement(event.elementType!, event.attributes);

    // 复制内容
    while (originalInfo.element.firstChild) {
      newElement.appendChild(originalInfo.element.firstChild);
    }

    // 替换元素
    originalInfo.element.parentNode?.replaceChild(newElement, originalInfo.element);

    // 更新映射
    this.elementMap.set(event.startOffset, {
      element: newElement,
      type: event.elementType!,
      temporary: false,
    });

    // 回收旧元素
    this.recycleElement(originalInfo.element, originalInfo.type);
  }

  /**
   * 创建元素
   */
  private createElement(type: MarkdownElementType, attributes?: Record<string, any>): HTMLElement {
    // 尝试从对象池获取
    const poolKey = type;
    let element = this.getFromPool(poolKey);

    if (!element) {
      element = this.createNewElement(type, attributes);
    } else {
      // 重置元素
      this.resetElement(element, type, attributes);
    }

    return element;
  }

  /**
   * 创建新元素
   */
  private createNewElement(
    type: MarkdownElementType,
    attributes?: Record<string, any>
  ): HTMLElement {
    let element: HTMLElement;

    switch (type) {
      case MarkdownElementType.HEADING: {
        const level = attributes?.level || 1;
        element = document.createElement(`h${level}`);
        this.styleHeading(element, level);
        break;
      }

      case MarkdownElementType.PARAGRAPH:
        element = document.createElement('p');
        element.style.marginBottom = '16px';
        break;

      case MarkdownElementType.BLOCKQUOTE:
        element = document.createElement('blockquote');
        element.style.borderLeft = '4px solid #dfe2e5';
        element.style.paddingLeft = '16px';
        element.style.color = '#6a737d';
        element.style.margin = '0 0 16px 0';
        break;

      case MarkdownElementType.CODE_BLOCK:
        element = document.createElement('pre');
        element.style.backgroundColor = '#f6f8fa';
        element.style.padding = '16px';
        element.style.borderRadius = '6px';
        element.style.overflow = 'auto';
        element.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
        element.style.fontSize = '85%';
        break;

      case MarkdownElementType.LIST:
        element = document.createElement('ul');
        element.style.paddingLeft = '2em';
        element.style.marginBottom = '16px';
        break;

      case MarkdownElementType.LIST_ITEM:
        element = document.createElement('li');
        element.style.marginBottom = '4px';
        break;

      case MarkdownElementType.HORIZONTAL_RULE:
        element = document.createElement('hr');
        element.style.border = 'none';
        element.style.borderBottom = '1px solid #e1e4e8';
        element.style.margin = '24px 0';
        break;

      case MarkdownElementType.STRONG:
        element = document.createElement('strong');
        element.style.fontWeight = '600';
        break;

      case MarkdownElementType.EMPHASIS:
        element = document.createElement('em');
        element.style.fontStyle = 'italic';
        break;

      case MarkdownElementType.CODE:
        element = document.createElement('code');
        element.style.backgroundColor = 'rgba(27,31,35,0.05)';
        element.style.padding = '0.2em 0.4em';
        element.style.borderRadius = '3px';
        element.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
        element.style.fontSize = '85%';
        break;

      case MarkdownElementType.LINK:
        element = document.createElement('a');
        element.style.color = '#0366d6';
        element.style.textDecoration = 'none';
        if (attributes?.href) {
          (element as HTMLAnchorElement).href = attributes.href;
        }
        break;

      case MarkdownElementType.IMAGE:
        element = document.createElement('img');
        element.style.maxWidth = '100%';
        if (attributes?.src) {
          (element as HTMLImageElement).src = attributes.src;
        }
        if (attributes?.alt) {
          (element as HTMLImageElement).alt = attributes.alt;
        }
        break;

      case MarkdownElementType.STRIKETHROUGH:
        element = document.createElement('del');
        element.style.textDecoration = 'line-through';
        break;

      default:
        element = document.createElement('span');
    }

    return element;
  }

  /**
   * 设置标题样式
   */
  private styleHeading(element: HTMLElement, level: number): void {
    const sizes = ['2em', '1.5em', '1.25em', '1em', '0.875em', '0.85em'];
    const margins = ['0.67em', '0.75em', '0.83em', '1em', '1.33em', '1.67em'];

    element.style.fontSize = sizes[level - 1] || '1em';
    element.style.fontWeight = '600';
    element.style.marginTop = margins[level - 1] || '1em';
    element.style.marginBottom = '16px';
    element.style.lineHeight = '1.25';
  }

  /**
   * 从对象池获取元素
   */
  private getFromPool(type: string): HTMLElement | null {
    const pool = this.elementPool.get(type);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }
    return null;
  }

  /**
   * 回收元素到对象池
   */
  private recycleElement(element: HTMLElement, type: MarkdownElementType): void {
    // 清理元素
    element.innerHTML = '';
    element.className = '';
    element.removeAttribute('style');

    // 添加到对象池
    const poolKey = type;
    if (!this.elementPool.has(poolKey)) {
      this.elementPool.set(poolKey, []);
    }

    const pool = this.elementPool.get(poolKey)!;
    if (pool.length < 50) {
      // 限制池大小
      pool.push(element);
    }
  }

  /**
   * 重置元素
   */
  private resetElement(
    element: HTMLElement,
    type: MarkdownElementType,
    attributes?: Record<string, any>
  ): void {
    // 根据类型重新应用样式
    const newElement = this.createNewElement(type, attributes);

    // 复制样式
    element.setAttribute('style', newElement.getAttribute('style') || '');

    // 应用属性
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (key in element) {
          (element as any)[key] = value;
        }
      });
    }
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.destroyed = true;
    this.elementMap.clear();
    this.elementStack = [];
    this.currentParent = this.container;
    this.pendingTextContent = '';
    this.elementPool.clear();
  }
}
