/**
 * 快照渲染器 - 将令牌流转换为 DOM 快照
 *
 * 核心职责：
 * 1. 接收来自乐观解析器的令牌
 * 2. 生成完整的 DOM 快照
 * 3. 发出快照事件供 DOM 差分模块使用
 * 4. 集成样式处理器以添加样式
 */

import { EventBus } from '../infrastructure/event-bus.js';
import { StyleProcessorV2 } from '../infrastructure/style-processor-v2.js';
import { Token } from './optimistic-parser.js';
import { DOMSnapshot } from './dom-diff.js';

/**
 * 快照渲染器配置
 */
export interface SnapshotRendererOptions {
  eventBus: EventBus;
  styleProcessor: StyleProcessorV2;
  containerTag?: string;
  containerId?: string;
}

/**
 * 渲染上下文
 */
interface RenderContext {
  type: 'bold' | 'italic' | 'code' | 'link' | 'paragraph';
  node: DOMSnapshot;
}

/**
 * 快照渲染器
 */
export class SnapshotRenderer {
  private eventBus: EventBus;
  private styleProcessor: StyleProcessorV2;
  private containerTag: string;
  private containerId: string;
  private currentSnapshot: DOMSnapshot;
  private contextStack: RenderContext[] = [];
  private nodeIdCounter = 0;
  private snapshotVersion = 0;

  constructor(options: SnapshotRendererOptions) {
    this.eventBus = options.eventBus;
    this.styleProcessor = options.styleProcessor;
    this.containerTag = options.containerTag || 'div';
    this.containerId = options.containerId || 'content';

    // 创建初始快照
    this.currentSnapshot = this.createContainer();

    // 监听令牌事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 使用类型断言解决事件系统类型问题
    (
      this.eventBus as unknown as {
        on: (event: string, handler: (data: { token: Token }) => void) => void;
      }
    ).on('parser:token', ({ token }: { token: Token }) => {
      this.handleToken(token);
    });
  }

  /**
   * 创建容器节点
   */
  private createContainer(): DOMSnapshot {
    return {
      nodeId: this.containerId,
      type: 'element',
      tagName: this.containerTag,
      attributes: {
        id: this.containerId,
        'data-node-id': this.containerId,
      },
      children: [],
    };
  }

  /**
   * 生成节点 ID
   */
  private generateNodeId(): string {
    return `node-${this.nodeIdCounter++}`;
  }

  /**
   * 处理令牌
   */
  private handleToken(token: Token): void {
    switch (token.type) {
      case 'TEXT':
        this.handleTextToken(token);
        break;
      case 'BOLD_START':
        this.handleBoldStart();
        break;
      case 'BOLD_END':
        this.handleBoldEnd(token);
        break;
      case 'ITALIC_START':
        this.handleItalicStart();
        break;
      case 'ITALIC_END':
        this.handleItalicEnd();
        break;
      case 'CODE_START':
        this.handleCodeStart();
        break;
      case 'CODE_END':
        this.handleCodeEnd();
        break;
      case 'PARAGRAPH_START':
        this.handleParagraphStart();
        break;
      case 'PARAGRAPH_END':
        this.handleParagraphEnd();
        break;
      case 'LINE_BREAK':
        this.handleLineBreak();
        break;
      case 'CORRECTION_TO_BOLD_START':
        this.handleCorrectionToBoldStart();
        break;
      case 'CORRECTION_TO_TEXT_SPACE':
        this.handleCorrectionToTextSpace();
        break;
      case 'CORRECTION_TO_LINE_BREAK':
        this.handleCorrectionToLineBreak();
        break;
      default:
        // 暂时忽略其他令牌类型
        break;
    }

    // 发出快照事件
    this.emitSnapshot();
  }

  /**
   * 处理文本令牌
   */
  private handleTextToken(token: Token): void {
    if (!token.content) return;

    const textNode: DOMSnapshot = {
      nodeId: this.generateNodeId(),
      type: 'text',
      textContent: token.content,
    };

    // 添加到当前上下文
    const currentContext = this.getCurrentContext();
    if (!currentContext.node.children) {
      currentContext.node.children = [];
    }
    currentContext.node.children.push(textNode);
  }

  /**
   * 处理加粗开始
   */
  private handleBoldStart(): void {
    const nodeId = this.generateNodeId();
    const boldNode: DOMSnapshot = {
      nodeId: nodeId,
      type: 'element',
      tagName: 'strong',
      attributes: {
        'data-node-id': nodeId,
      },
      children: [],
    };

    // 应用样式
    const styles = this.styleProcessor.getStylesForTag('strong');
    if (styles && styles.length > 0) {
      boldNode.className = styles.join(' ');
    }

    // 添加到当前上下文
    const currentContext = this.getCurrentContext();
    if (!currentContext.node.children) {
      currentContext.node.children = [];
    }
    currentContext.node.children.push(boldNode);

    // 推入上下文栈
    this.contextStack.push({
      type: 'bold',
      node: boldNode,
    });
  }

  /**
   * 处理加粗结束
   */
  private handleBoldEnd(token: Token): void {
    // 只在第二个 * 时才真正结束加粗
    if (token.index === 2) {
      const context = this.contextStack.pop();
      if (!context || context.type !== 'bold') {
        console.warn('Unexpected BOLD_END token');
      }
    }
    // 第一个 * 时不做任何操作，等待第二个 *
  }

  /**
   * 处理斜体开始
   */
  private handleItalicStart(): void {
    const nodeId = this.generateNodeId();
    const italicNode: DOMSnapshot = {
      nodeId: nodeId,
      type: 'element',
      tagName: 'em',
      attributes: {
        'data-node-id': nodeId,
      },
      children: [],
    };

    // 应用样式
    const styles = this.styleProcessor.getStylesForTag('em');
    if (styles && styles.length > 0) {
      italicNode.className = styles.join(' ');
    }

    // 添加到当前上下文
    const currentContext = this.getCurrentContext();
    if (!currentContext.node.children) {
      currentContext.node.children = [];
    }
    currentContext.node.children.push(italicNode);

    // 推入上下文栈
    this.contextStack.push({
      type: 'italic',
      node: italicNode,
    });
  }

  /**
   * 处理斜体结束
   */
  private handleItalicEnd(): void {
    // 弹出上下文栈
    const context = this.contextStack.pop();
    if (!context || context.type !== 'italic') {
      console.warn('Unexpected ITALIC_END token');
    }
  }

  /**
   * 处理代码开始
   */
  private handleCodeStart(): void {
    const nodeId = this.generateNodeId();
    const codeNode: DOMSnapshot = {
      nodeId: nodeId,
      type: 'element',
      tagName: 'code',
      attributes: {
        'data-node-id': nodeId,
      },
      children: [],
    };

    // 应用样式
    const styles = this.styleProcessor.getStylesForTag('code');
    if (styles && styles.length > 0) {
      codeNode.className = styles.join(' ');
    }

    // 添加到当前上下文
    const currentContext = this.getCurrentContext();
    if (!currentContext.node.children) {
      currentContext.node.children = [];
    }
    currentContext.node.children.push(codeNode);

    // 推入上下文栈
    this.contextStack.push({
      type: 'code',
      node: codeNode,
    });
  }

  /**
   * 处理代码结束
   */
  private handleCodeEnd(): void {
    // 弹出上下文栈
    const context = this.contextStack.pop();
    if (!context || context.type !== 'code') {
      console.warn('Unexpected CODE_END token');
    }
  }

  /**
   * 处理段落开始
   */
  private handleParagraphStart(): void {
    const nodeId = this.generateNodeId();
    const paragraphNode: DOMSnapshot = {
      nodeId: nodeId,
      type: 'element',
      tagName: 'p',
      attributes: {
        'data-node-id': nodeId,
      },
      children: [],
    };

    // 应用样式
    const styles = this.styleProcessor.getStylesForTag('p');
    if (styles && styles.length > 0) {
      paragraphNode.className = styles.join(' ');
    }

    // 添加到当前上下文
    const currentContext = this.getCurrentContext();
    if (!currentContext.node.children) {
      currentContext.node.children = [];
    }
    currentContext.node.children.push(paragraphNode);

    // 推入上下文栈
    this.contextStack.push({
      type: 'paragraph',
      node: paragraphNode,
    });
  }

  /**
   * 处理段落结束
   */
  private handleParagraphEnd(): void {
    // 弹出上下文栈
    const context = this.contextStack.pop();
    if (!context || context.type !== 'paragraph') {
      console.warn('Unexpected PARAGRAPH_END token');
    }
  }

  /**
   * 处理换行
   */
  private handleLineBreak(): void {
    const nodeId = this.generateNodeId();
    const brNode: DOMSnapshot = {
      nodeId: nodeId,
      type: 'element',
      tagName: 'br',
      attributes: {
        'data-node-id': nodeId,
      },
    };

    // 添加到当前上下文
    const currentContext = this.getCurrentContext();
    if (!currentContext.node.children) {
      currentContext.node.children = [];
    }
    currentContext.node.children.push(brNode);
  }

  /**
   * 获取当前上下文
   */
  private getCurrentContext(): RenderContext {
    if (this.contextStack.length === 0) {
      // 如果没有上下文，返回容器作为默认上下文
      return {
        type: 'paragraph',
        node: this.currentSnapshot,
      };
    }
    return this.contextStack[this.contextStack.length - 1];
  }

  /**
   * 处理修正令牌：撤销斜体，改为加粗开始
   */
  private handleCorrectionToBoldStart(): void {
    // 撤销最后一个斜体开始 - 移除最后一个上下文
    if (this.contextStack.length > 0) {
      const lastContext = this.contextStack[this.contextStack.length - 1];
      if (lastContext.type === 'italic') {
        this.contextStack.pop();
        // 从父节点中移除最后一个斜体元素
        const parentContext = this.getCurrentContext();
        if (parentContext.node.children && parentContext.node.children.length > 0) {
          parentContext.node.children.pop();
        }
      }
    }

    // 开始加粗
    this.handleBoldStart();
  }

  /**
   * 处理修正令牌：撤销格式，改为空格
   */
  private handleCorrectionToTextSpace(): void {
    // 撤销最后一个格式开始
    if (this.contextStack.length > 0) {
      this.contextStack.pop();
      // 从父节点中移除最后一个格式元素
      const parentContext = this.getCurrentContext();
      if (parentContext.node.children && parentContext.node.children.length > 0) {
        parentContext.node.children.pop();
      }
    }

    // 添加*和空格作为普通文本
    this.handleTextToken({ type: 'TEXT', content: '*' });
    this.handleTextToken({ type: 'TEXT', content: ' ' });
  }

  /**
   * 处理修正令牌：撤销格式，改为换行
   */
  private handleCorrectionToLineBreak(): void {
    // 撤销最后一个格式开始
    if (this.contextStack.length > 0) {
      this.contextStack.pop();
      // 从父节点中移除最后一个格式元素
      const parentContext = this.getCurrentContext();
      if (parentContext.node.children && parentContext.node.children.length > 0) {
        parentContext.node.children.pop();
      }
    }

    // 添加*和换行
    this.handleTextToken({ type: 'TEXT', content: '*' });
    this.handleLineBreak();
  }

  /**
   * 发出快照事件
   */
  private emitSnapshot(): void {
    this.snapshotVersion++;

    // 深拷贝快照以避免后续修改影响
    const snapshot = JSON.parse(JSON.stringify(this.currentSnapshot));

    this.eventBus.emit('snapshot:updated', {
      snapshot,
      version: this.snapshotVersion,
      timestamp: Date.now(),
    });
  }

  /**
   * 重置渲染器
   */
  reset(): void {
    this.currentSnapshot = this.createContainer();
    this.contextStack = [];
    this.nodeIdCounter = 0;
    this.snapshotVersion = 0;
  }

  /**
   * 获取当前快照
   */
  getCurrentSnapshot(): DOMSnapshot {
    return JSON.parse(JSON.stringify(this.currentSnapshot));
  }
}
