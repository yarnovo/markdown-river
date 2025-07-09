/**
 * DOM 管理器 V2 - 简化版 DOM 操作管理器
 *
 * 核心职责：
 * 1. 提供基础的 DOM 操作方法
 * 2. 维护节点 ID 映射
 * 3. 直接执行 DOM 操作，无批处理
 * 4. 无事件系统，专门供 DOM diff 模块使用
 */

/**
 * DOM 管理器 V2 配置
 */
export interface DOMManagerV2Options {
  container?: HTMLElement;
}

/**
 * DOM 管理器 V2
 */
export class DOMManagerV2 {
  private container: HTMLElement;
  private nodeMap: Map<string, HTMLElement> = new Map();

  constructor(options: DOMManagerV2Options = {}) {
    this.container = options.container || document.body;
  }

  /**
   * 创建元素
   */
  createElement(tag: string, nodeId: string, attributes?: Record<string, string>): HTMLElement {
    const element = document.createElement(tag);

    // 设置节点 ID
    element.setAttribute('data-node-id', nodeId);

    // 设置其他属性
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }

    // 添加到节点映射
    this.nodeMap.set(nodeId, element);

    return element;
  }

  /**
   * 创建文本节点
   */
  createTextNode(content: string): Text {
    return document.createTextNode(content);
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): HTMLElement | null {
    return this.nodeMap.get(nodeId) || null;
  }

  /**
   * 添加子节点
   */
  appendChild(parentId: string, child: Node): void {
    const parent = this.getNode(parentId);
    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`);
    }
    parent.appendChild(child);
  }

  /**
   * 插入节点到指定位置
   */
  insertBefore(parentId: string, child: Node, beforeNodeId: string): void {
    const parent = this.getNode(parentId);
    const beforeNode = this.getNode(beforeNodeId);

    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    if (!beforeNode) {
      throw new Error(`Before node ${beforeNodeId} not found`);
    }

    parent.insertBefore(child, beforeNode);
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      return;
    }

    // 从父节点移除
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    // 从映射中移除
    this.nodeMap.delete(nodeId);

    // 递归移除所有子节点的映射
    this.removeChildMappings(node);
  }

  /**
   * 递归移除子节点映射
   */
  private removeChildMappings(node: HTMLElement): void {
    // 获取所有带有 data-node-id 的子节点
    const childNodes = node.querySelectorAll('[data-node-id]');
    childNodes.forEach(child => {
      const nodeId = child.getAttribute('data-node-id');
      if (nodeId) {
        this.nodeMap.delete(nodeId);
      }
    });
  }

  /**
   * 更新文本内容
   */
  updateTextContent(nodeId: string, content: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    node.textContent = content;
  }

  /**
   * 更新属性
   */
  updateAttributes(nodeId: string, attributes: Record<string, string>): void {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // 清除现有属性（除了 data-node-id）
    const existingAttributes = Array.from(node.attributes);
    existingAttributes.forEach(attr => {
      if (attr.name !== 'data-node-id') {
        node.removeAttribute(attr.name);
      }
    });

    // 设置新属性
    Object.entries(attributes).forEach(([key, value]) => {
      node.setAttribute(key, value);
    });
  }

  /**
   * 添加 CSS 类
   */
  addClass(nodeId: string, className: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    node.classList.add(className);
  }

  /**
   * 移除 CSS 类
   */
  removeClass(nodeId: string, className: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    node.classList.remove(className);
  }

  /**
   * 切换 CSS 类
   */
  toggleClass(nodeId: string, className: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    node.classList.toggle(className);
  }

  /**
   * 清空容器
   */
  clear(): void {
    this.container.innerHTML = '';
    this.nodeMap.clear();
  }

  /**
   * 获取容器
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * 设置容器
   */
  setContainer(container: HTMLElement): void {
    this.container = container;
    this.clear();
  }

  /**
   * 挂载到容器
   */
  mountToContainer(nodeId: string): void {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // 清空容器并添加节点
    this.container.innerHTML = '';
    this.container.appendChild(node);
  }

  /**
   * 检查节点是否存在
   */
  hasNode(nodeId: string): boolean {
    return this.nodeMap.has(nodeId);
  }

  /**
   * 获取所有节点 ID
   */
  getNodeIds(): string[] {
    return Array.from(this.nodeMap.keys());
  }

  /**
   * 重置
   */
  reset(): void {
    this.clear();
  }
}
