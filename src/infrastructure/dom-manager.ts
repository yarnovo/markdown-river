/**
 * DOM 管理器 - 高效管理 DOM 操作
 *
 * 核心功能：
 * 1. 批量 DOM 更新，减少重绘和重排
 * 2. 虚拟节点缓存，提高性能
 * 3. 增量更新策略，只更新变化的部分
 * 4. 异步批处理，优化渲染性能
 */

import { EventBus } from './event-bus';
import {
  DOMCreateEventData,
  DOMUpdateEventData,
  DOMRemoveEventData,
  DOMBatchUpdateEventData,
} from '../types/dom-events';

/**
 * DOM 节点配置
 */
export interface DOMNodeConfig {
  /**
   * 节点标签名
   */
  tag: string;

  /**
   * 节点属性
   */
  attributes?: Record<string, string>;

  /**
   * CSS 类名
   */
  className?: string;

  /**
   * 节点文本内容
   */
  text?: string;

  /**
   * 子节点
   */
  children?: DOMNodeConfig[];
}

/**
 * DOM 操作类型
 */
export type DOMOperation =
  | { type: 'create'; config: DOMNodeConfig; parentId?: string }
  | { type: 'update'; nodeId: string; updates: Partial<DOMNodeConfig> }
  | { type: 'remove'; nodeId: string }
  | { type: 'appendChild'; parentId: string; childId: string }
  | { type: 'insertBefore'; parentId: string; childId: string; referenceId: string }
  | { type: 'setText'; nodeId: string; text: string }
  | { type: 'setAttribute'; nodeId: string; name: string; value: string }
  | { type: 'setClass'; nodeId: string; className: string };

/**
 * 虚拟节点
 */
interface VirtualNode {
  id: string;
  element: HTMLElement;
  config: DOMNodeConfig;
  parentId?: string;
  childIds: string[];
}

/**
 * DOM 管理器配置
 */
export interface DOMManagerOptions {
  /**
   * 容器元素
   */
  container: HTMLElement;

  /**
   * 批处理延迟时间（毫秒）
   * @default 16
   */
  batchDelay?: number;

  /**
   * 最大批处理大小
   * @default 100
   */
  maxBatchSize?: number;

  /**
   * 是否启用虚拟节点缓存
   * @default true
   */
  enableCache?: boolean;

  /**
   * 事件总线实例
   */
  eventBus?: EventBus;
}

export class DOMManager {
  private container: HTMLElement;
  private batchDelay: number;
  private maxBatchSize: number;
  private enableCache: boolean;
  private eventBus?: EventBus;

  /**
   * 虚拟节点缓存
   */
  private nodeCache: Map<string, VirtualNode> = new Map();

  /**
   * 待处理的操作队列
   */
  private operationQueue: DOMOperation[] = [];

  /**
   * 批处理定时器
   */
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 节点 ID 计数器
   */
  private nodeIdCounter: number = 0;

  /**
   * 批次 ID 计数器
   */
  private batchIdCounter: number = 0;

  constructor(options: DOMManagerOptions) {
    this.container = options.container;
    this.batchDelay = options.batchDelay ?? 16; // 默认一帧的时间
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.enableCache = options.enableCache ?? true;
    this.eventBus = options.eventBus;
  }

  /**
   * 创建节点
   */
  createElement(config: DOMNodeConfig, parentId?: string): string {
    const nodeId = this.generateNodeId();
    const operation: DOMOperation = {
      type: 'create',
      config: { ...config, attributes: { ...config.attributes, 'data-node-id': nodeId } },
      parentId,
    };

    // 在排队操作前，先在缓存中预留位置
    if (this.enableCache) {
      this.nodeCache.set(nodeId, {
        id: nodeId,
        element: null as unknown as HTMLElement, // 将在执行时设置
        config: operation.config,
        parentId,
        childIds: [],
      });
    }

    this.enqueueOperation(operation);
    return nodeId;
  }

  /**
   * 更新节点
   */
  updateElement(nodeId: string, updates: Partial<DOMNodeConfig>): void {
    this.enqueueOperation({
      type: 'update',
      nodeId,
      updates,
    });
  }

  /**
   * 删除节点
   */
  removeElement(nodeId: string): void {
    this.enqueueOperation({
      type: 'remove',
      nodeId,
    });
  }

  /**
   * 设置文本内容
   */
  setText(nodeId: string, text: string): void {
    this.enqueueOperation({
      type: 'setText',
      nodeId,
      text,
    });
  }

  /**
   * 设置属性
   */
  setAttribute(nodeId: string, name: string, value: string): void {
    this.enqueueOperation({
      type: 'setAttribute',
      nodeId,
      name,
      value,
    });
  }

  /**
   * 设置 CSS 类
   */
  setClass(nodeId: string, className: string): void {
    this.enqueueOperation({
      type: 'setClass',
      nodeId,
      className,
    });
  }

  /**
   * 添加子节点
   */
  appendChild(parentId: string, childId: string): void {
    this.enqueueOperation({
      type: 'appendChild',
      parentId,
      childId,
    });
  }

  /**
   * 在指定节点前插入
   */
  insertBefore(parentId: string, childId: string, referenceId: string): void {
    this.enqueueOperation({
      type: 'insertBefore',
      parentId,
      childId,
      referenceId,
    });
  }

  /**
   * 立即执行所有待处理的操作
   */
  flush(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.processBatch();
  }

  /**
   * 获取节点元素
   */
  getElement(nodeId: string): HTMLElement | null {
    // 如果禁用了缓存，直接从 DOM 查找
    if (!this.enableCache) {
      return this.container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
    }

    const vNode = this.nodeCache.get(nodeId);
    // 如果缓存中有元素，直接返回
    if (vNode?.element) {
      return vNode.element;
    }

    // 如果没有缓存或元素未设置，尝试从 DOM 中查找
    const element = this.container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;

    // 更新缓存
    if (element && vNode) {
      vNode.element = element;
    }

    return element;
  }

  /**
   * 清空所有内容
   */
  clear(): void {
    this.operationQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.nodeCache.clear();
    this.container.innerHTML = '';
  }

  /**
   * 将操作加入队列
   */
  private enqueueOperation(operation: DOMOperation): void {
    this.operationQueue.push(operation);

    // 如果达到最大批处理大小，立即处理
    if (this.operationQueue.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // 否则安排批处理
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        this.processBatch();
      }, this.batchDelay);
    }
  }

  /**
   * 处理批量操作
   */
  private processBatch(): void {
    if (this.operationQueue.length === 0) {
      return;
    }

    const batchId = `batch-${this.batchIdCounter++}`;
    const operations = [...this.operationQueue];
    this.operationQueue = [];

    // 使用 requestAnimationFrame 优化渲染
    requestAnimationFrame(() => {
      operations.forEach(operation => {
        this.executeOperation(operation);
      });

      this.eventBus?.emit<DOMBatchUpdateEventData>('dom:batch-update', {
        operationCount: operations.length,
        batchId,
        timestamp: Date.now(),
        source: 'DOMManager',
      });
    });
  }

  /**
   * 执行单个操作
   */
  private executeOperation(operation: DOMOperation): void {
    switch (operation.type) {
      case 'create':
        this.executeCreate(operation.config, operation.parentId);
        break;
      case 'update':
        this.executeUpdate(operation.nodeId, operation.updates);
        break;
      case 'remove':
        this.executeRemove(operation.nodeId);
        break;
      case 'appendChild':
        this.executeAppendChild(operation.parentId, operation.childId);
        break;
      case 'insertBefore':
        this.executeInsertBefore(operation.parentId, operation.childId, operation.referenceId);
        break;
      case 'setText':
        this.executeSetText(operation.nodeId, operation.text);
        break;
      case 'setAttribute':
        this.executeSetAttribute(operation.nodeId, operation.name, operation.value);
        break;
      case 'setClass':
        this.executeSetClass(operation.nodeId, operation.className);
        break;
    }
  }

  /**
   * 执行创建节点
   */
  private executeCreate(config: DOMNodeConfig, parentId?: string): string {
    // 从配置中获取 nodeId（如果有）
    const nodeId = config.attributes?.['data-node-id'] || this.generateNodeId();
    const element = document.createElement(config.tag);

    // 设置属性
    if (config.attributes) {
      Object.entries(config.attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
    }

    // 设置类名
    if (config.className) {
      element.className = config.className;
    }

    // 设置文本内容
    if (config.text) {
      element.textContent = config.text;
    }

    // 创建或更新虚拟节点
    const existingVNode = this.nodeCache.get(nodeId);
    const vNode: VirtualNode = existingVNode || {
      id: nodeId,
      element,
      config: { ...config },
      parentId,
      childIds: [],
    };

    // 更新元素引用
    vNode.element = element;

    // 缓存虚拟节点
    if (this.enableCache && !existingVNode) {
      this.nodeCache.set(nodeId, vNode);
    }

    // 添加到父节点或容器
    if (parentId) {
      const parentVNode = this.nodeCache.get(parentId);
      if (parentVNode) {
        parentVNode.element.appendChild(element);
        parentVNode.childIds.push(nodeId);
      }
    } else {
      this.container.appendChild(element);
    }

    // 递归创建子节点
    if (config.children) {
      config.children.forEach(childConfig => {
        const childId = this.executeCreate(childConfig, nodeId);
        vNode.childIds.push(childId);
      });
    }

    this.eventBus?.emit<DOMCreateEventData>('dom:create', {
      nodeType: config.tag,
      nodeId,
      parentId,
      timestamp: Date.now(),
      source: 'DOMManager',
    });

    return nodeId;
  }

  /**
   * 执行更新节点
   */
  private executeUpdate(nodeId: string, updates: Partial<DOMNodeConfig>): void {
    const vNode = this.nodeCache.get(nodeId);
    if (!vNode) {
      return;
    }

    const element = vNode.element;

    // 更新文本
    if (updates.text !== undefined) {
      element.textContent = updates.text;
      vNode.config.text = updates.text;
    }

    // 更新属性
    if (updates.attributes) {
      Object.entries(updates.attributes).forEach(([name, value]) => {
        element.setAttribute(name, value);
      });
      vNode.config.attributes = { ...vNode.config.attributes, ...updates.attributes };
    }

    // 更新类名
    if (updates.className !== undefined) {
      element.className = updates.className;
      vNode.config.className = updates.className;
    }

    this.eventBus?.emit<DOMUpdateEventData>('dom:update', {
      nodeId,
      updateType: updates.text ? 'text' : updates.attributes ? 'attribute' : 'style',
      updates,
      timestamp: Date.now(),
      source: 'DOMManager',
    });
  }

  /**
   * 执行删除节点
   */
  private executeRemove(nodeId: string): void {
    const vNode = this.nodeCache.get(nodeId);
    if (!vNode) {
      return;
    }

    // 递归删除子节点
    [...vNode.childIds].forEach(childId => {
      this.executeRemove(childId);
    });

    // 从父节点移除
    if (vNode.parentId) {
      const parentVNode = this.nodeCache.get(vNode.parentId);
      if (parentVNode) {
        const index = parentVNode.childIds.indexOf(nodeId);
        if (index !== -1) {
          parentVNode.childIds.splice(index, 1);
        }
      }
    }

    // 从 DOM 中移除
    vNode.element.remove();

    // 从缓存中移除
    this.nodeCache.delete(nodeId);

    this.eventBus?.emit<DOMRemoveEventData>('dom:remove', {
      nodeId,
      recursive: true,
      timestamp: Date.now(),
      source: 'DOMManager',
    });
  }

  /**
   * 执行添加子节点
   */
  private executeAppendChild(parentId: string, childId: string): void {
    const parentVNode = this.nodeCache.get(parentId);
    const childVNode = this.nodeCache.get(childId);

    if (!parentVNode || !childVNode) {
      return;
    }

    parentVNode.element.appendChild(childVNode.element);
    parentVNode.childIds.push(childId);
    childVNode.parentId = parentId;
  }

  /**
   * 执行在指定节点前插入
   */
  private executeInsertBefore(parentId: string, childId: string, referenceId: string): void {
    const parentVNode = this.nodeCache.get(parentId);
    const childVNode = this.nodeCache.get(childId);
    const referenceVNode = this.nodeCache.get(referenceId);

    if (!parentVNode || !childVNode || !referenceVNode) {
      return;
    }

    parentVNode.element.insertBefore(childVNode.element, referenceVNode.element);

    // 更新子节点列表
    const refIndex = parentVNode.childIds.indexOf(referenceId);
    if (refIndex !== -1) {
      parentVNode.childIds.splice(refIndex, 0, childId);
    }
    childVNode.parentId = parentId;
  }

  /**
   * 执行设置文本
   */
  private executeSetText(nodeId: string, text: string): void {
    const vNode = this.nodeCache.get(nodeId);
    if (!vNode) {
      return;
    }

    vNode.element.textContent = text;
    vNode.config.text = text;
  }

  /**
   * 执行设置属性
   */
  private executeSetAttribute(nodeId: string, name: string, value: string): void {
    const vNode = this.nodeCache.get(nodeId);
    if (!vNode) {
      return;
    }

    vNode.element.setAttribute(name, value);
    if (!vNode.config.attributes) {
      vNode.config.attributes = {};
    }
    vNode.config.attributes[name] = value;
  }

  /**
   * 执行设置类名
   */
  private executeSetClass(nodeId: string, className: string): void {
    const vNode = this.nodeCache.get(nodeId);
    if (!vNode) {
      return;
    }

    vNode.element.className = className;
    vNode.config.className = className;
  }

  /**
   * 生成节点 ID
   */
  private generateNodeId(): string {
    return `node-${this.nodeIdCounter++}`;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; nodeIds: string[] } {
    return {
      size: this.nodeCache.size,
      nodeIds: Array.from(this.nodeCache.keys()),
    };
  }
}
