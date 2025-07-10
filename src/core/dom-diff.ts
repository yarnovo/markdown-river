/**
 * DOM 差分计算模块
 *
 * 负责：
 * 1. 接收 DOM 快照
 * 2. 计算与上一次快照的差异
 * 3. 生成最小化的 DOM 更新操作
 * 4. 维护 DOM 状态
 */

import { EventBus } from '../infrastructure/event-bus.js';

/**
 * DOM 节点快照
 */
export interface DOMSnapshot {
  /**
   * 节点类型
   */
  type: 'element' | 'text';

  /**
   * 标签名（仅元素节点）
   */
  tagName?: string;

  /**
   * 文本内容（仅文本节点）
   */
  textContent?: string;

  /**
   * 属性
   */
  attributes?: Record<string, string>;

  /**
   * CSS 类
   */
  className?: string;

  /**
   * 子节点
   */
  children?: DOMSnapshot[];

  /**
   * 节点标识（用于追踪）
   */
  nodeId?: string;
}

/**
 * DOM 操作类型
 */
export type DOMOperation = CreateOperation | UpdateOperation | DeleteOperation | MoveOperation;

interface CreateOperation {
  type: 'create';
  parent: string | null;
  node: DOMSnapshot;
  index?: number;
}

interface UpdateOperation {
  type: 'update';
  nodeId: string;
  changes: Partial<{
    textContent: string;
    className: string;
    attributes: Record<string, string>;
  }>;
}

interface DeleteOperation {
  type: 'delete';
  nodeId: string;
}

interface MoveOperation {
  type: 'move';
  nodeId: string;
  newParent: string;
  newIndex: number;
}

/**
 * DOM 差分配置
 */
export interface DOMDiffOptions {
  /**
   * 事件总线
   */
  eventBus?: EventBus;

  /**
   * 是否启用调试日志
   */
  debug?: boolean;
}

/**
 * DOM 差分计算器
 */
export class DOMDiff {
  private eventBus: EventBus;
  private previousSnapshot: DOMSnapshot | null = null;
  private nodeMap = new Map<string, DOMSnapshot>();
  private debug: boolean;
  private operationId = 0;

  constructor(options: DOMDiffOptions = {}) {
    this.eventBus = options.eventBus || new EventBus();
    this.debug = options.debug || false;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.eventBus.on('snapshot:updated', (event: unknown) => {
      const { snapshot, version } = event as {
        snapshot: DOMSnapshot;
        version: number;
        timestamp: number;
      };
      this.handleSnapshot(snapshot, version);
    });
  }

  /**
   * 处理快照事件
   */
  private handleSnapshot(snapshot: DOMSnapshot, version: number): void {
    const operations = this.applySnapshot(snapshot);

    // 发出操作事件
    if (operations.length > 0) {
      this.eventBus.emit('dom:operations', {
        operations,
        version,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 应用新快照并计算差异
   */
  applySnapshot(snapshot: DOMSnapshot): DOMOperation[] {
    const operations: DOMOperation[] = [];

    if (!this.previousSnapshot) {
      // 第一次快照，创建所有节点
      this.createInitialOperations(snapshot, operations);
    } else {
      // 计算差异
      this.calculateDiff(this.previousSnapshot, snapshot, operations);
    }

    // 更新状态
    this.previousSnapshot = this.cloneSnapshot(snapshot);
    this.updateNodeMap(snapshot);

    // 发射事件
    if (operations.length > 0) {
      this.emitDiffEvent(operations);
    }

    return operations;
  }

  /**
   * 创建初始操作
   */
  private createInitialOperations(
    snapshot: DOMSnapshot,
    operations: DOMOperation[],
    parent: string | null = null,
    index = 0
  ): void {
    const nodeId = this.generateNodeId();
    snapshot.nodeId = nodeId;

    operations.push({
      type: 'create',
      parent,
      node: snapshot,
      index,
    });

    // 递归处理子节点
    if (snapshot.children) {
      snapshot.children.forEach((child, childIndex) => {
        this.createInitialOperations(child, operations, nodeId, childIndex);
      });
    }
  }

  /**
   * 计算两个快照的差异
   */
  private calculateDiff(
    oldSnapshot: DOMSnapshot,
    newSnapshot: DOMSnapshot,
    operations: DOMOperation[],
    parent: string | null = null,
    index = 0
  ): void {
    // 节点类型不同，替换整个节点
    if (oldSnapshot.type !== newSnapshot.type || oldSnapshot.tagName !== newSnapshot.tagName) {
      operations.push({
        type: 'delete',
        nodeId: oldSnapshot.nodeId!,
      });

      this.createInitialOperations(newSnapshot, operations, parent, index);
      return;
    }

    // 复用节点ID
    newSnapshot.nodeId = oldSnapshot.nodeId;

    // 检查属性变化
    const changes: UpdateOperation['changes'] = {};
    let hasChanges = false;

    // 文本内容变化
    if (oldSnapshot.textContent !== newSnapshot.textContent) {
      changes.textContent = newSnapshot.textContent!;
      hasChanges = true;
    }

    // 类名变化
    if (oldSnapshot.className !== newSnapshot.className) {
      changes.className = newSnapshot.className!;
      hasChanges = true;
    }

    // 属性变化
    if (!this.isAttributesEqual(oldSnapshot.attributes, newSnapshot.attributes)) {
      changes.attributes = newSnapshot.attributes || {};
      hasChanges = true;
    }

    if (hasChanges) {
      operations.push({
        type: 'update',
        nodeId: newSnapshot.nodeId!,
        changes,
      });
    }

    // 处理子节点
    this.diffChildren(
      oldSnapshot.children || [],
      newSnapshot.children || [],
      operations,
      newSnapshot.nodeId!
    );
  }

  /**
   * 比较子节点列表
   */
  private diffChildren(
    oldChildren: DOMSnapshot[],
    newChildren: DOMSnapshot[],
    operations: DOMOperation[],
    parentId: string
  ): void {
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (!oldChild && newChild) {
        // 新增节点
        this.createInitialOperations(newChild, operations, parentId, i);
      } else if (oldChild && !newChild) {
        // 删除节点及其所有子节点
        this.deleteNodeRecursive(oldChild, operations);
      } else if (oldChild && newChild) {
        // 比较节点
        this.calculateDiff(oldChild, newChild, operations, parentId, i);
      }
    }
  }

  /**
   * 递归删除节点及其子节点
   */
  private deleteNodeRecursive(node: DOMSnapshot, operations: DOMOperation[]): void {
    // 先删除所有子节点
    if (node.children) {
      node.children.forEach(child => {
        this.deleteNodeRecursive(child, operations);
      });
    }

    // 再删除当前节点
    if (node.nodeId) {
      operations.push({
        type: 'delete',
        nodeId: node.nodeId,
      });
    }
  }

  /**
   * 比较属性是否相等
   */
  private isAttributesEqual(
    attrs1?: Record<string, string>,
    attrs2?: Record<string, string>
  ): boolean {
    if (!attrs1 && !attrs2) return true;
    if (!attrs1 || !attrs2) return false;

    const keys1 = Object.keys(attrs1);
    const keys2 = Object.keys(attrs2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(key => attrs1[key] === attrs2[key]);
  }

  /**
   * 克隆快照
   */
  private cloneSnapshot(snapshot: DOMSnapshot): DOMSnapshot {
    return JSON.parse(JSON.stringify(snapshot));
  }

  /**
   * 更新节点映射
   */
  private updateNodeMap(snapshot: DOMSnapshot): void {
    this.nodeMap.clear();
    this.buildNodeMap(snapshot);
  }

  /**
   * 构建节点映射
   */
  private buildNodeMap(snapshot: DOMSnapshot): void {
    if (snapshot.nodeId) {
      this.nodeMap.set(snapshot.nodeId, snapshot);
    }

    if (snapshot.children) {
      snapshot.children.forEach(child => this.buildNodeMap(child));
    }
  }

  /**
   * 生成节点ID
   */
  private generateNodeId(): string {
    return `node-${this.operationId++}`;
  }

  /**
   * 发射差分事件
   */
  private emitDiffEvent(operations: DOMOperation[]): void {
    this.eventBus.emit('dom:diff', {
      operations,
      operationCount: operations.length,
      timestamp: Date.now(),
    });

    if (this.debug) {
      console.log('[DOM Diff] Operations:', operations);
    }
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.previousSnapshot = null;
    this.nodeMap.clear();
    this.operationId = 0;
  }

  /**
   * 获取当前快照
   */
  getCurrentSnapshot(): DOMSnapshot | null {
    return this.previousSnapshot;
  }

  /**
   * 获取节点映射
   */
  getNodeMap(): Map<string, DOMSnapshot> {
    return new Map(this.nodeMap);
  }
}
