/**
 * 流式渲染器 V2 - 基于快照的流式 Markdown 渲染器
 *
 * 核心流程：
 * 1. 乐观解析器处理输入字符，生成令牌
 * 2. 快照渲染器接收令牌，生成 DOM 快照
 * 3. DOM 差分模块比较快照，生成操作指令
 * 4. DOM 管理器执行操作，更新实际 DOM
 */

import { EventBus } from './infrastructure/event-bus.js';
import { StyleProcessorV2 } from './infrastructure/style-processor-v2.js';
import { DOMManagerV2 } from './infrastructure/dom-manager-v2.js';
import { OptimisticParser } from './core/optimistic-parser.js';
import { SnapshotRenderer } from './core/snapshot-renderer.js';
import { DOMDiff, DOMOperation, DOMSnapshot } from './core/dom-diff.js';

/**
 * 流式渲染器 V2 配置
 */
export interface StreamingRendererV2Options {
  container?: HTMLElement;
  styleProcessor?: StyleProcessorV2;
  debug?: boolean;
}

/**
 * 渲染器状态
 */
export type RendererState = 'idle' | 'rendering' | 'completed' | 'error';

/**
 * 流式渲染器 V2
 */
export class StreamingRendererV2 {
  private eventBus: EventBus;
  private styleProcessor: StyleProcessorV2;
  private domManager: DOMManagerV2;
  private parser: OptimisticParser;
  private snapshotRenderer: SnapshotRenderer;
  private domDiff: DOMDiff;

  private state: RendererState = 'idle';
  private debug: boolean;
  private inputCount = 0;

  constructor(options: StreamingRendererV2Options = {}) {
    this.debug = options.debug || false;

    // 创建事件总线
    this.eventBus = new EventBus();

    // 创建样式处理器
    this.styleProcessor = options.styleProcessor || new StyleProcessorV2();

    // 创建 DOM 管理器
    this.domManager = new DOMManagerV2({
      container: options.container,
    });

    // 创建各个组件
    this.parser = new OptimisticParser({ eventBus: this.eventBus });
    this.snapshotRenderer = new SnapshotRenderer({
      eventBus: this.eventBus,
      styleProcessor: this.styleProcessor,
    });

    // 创建 DOM Diff（注意：它自己会监听事件）
    this.domDiff = new DOMDiff({ eventBus: this.eventBus });

    // 设置事件监听
    this.setupEventListeners();

    // 初始化容器
    this.initializeContainer();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听 DOM 操作事件
    this.eventBus.on('dom:operations', (event: unknown) => {
      const opsEvent = event as { operations: DOMOperation[]; version: number; timestamp: number };
      this.applyOperations(opsEvent.operations);
    });

    // 监听解析器结束事件
    this.eventBus.on('parser:end', () => {
      this.handleParserEnd();
    });
  }

  /**
   * 初始化容器
   */
  private initializeContainer(): void {
    // DOM Diff 会通过事件自动处理初始快照
    // 只需要触发快照渲染器的初始快照即可
    const initialSnapshot = this.snapshotRenderer.getCurrentSnapshot();

    // 手动发出初始快照事件
    this.eventBus.emit('snapshot:updated', {
      snapshot: initialSnapshot,
      version: 0,
      timestamp: Date.now(),
    });
  }

  /**
   * 从快照创建元素
   */
  private createElementFromSnapshot(snapshot: DOMSnapshot): HTMLElement | Text | null {
    if (snapshot.type === 'text') {
      return this.domManager.createTextNode(snapshot.textContent || '');
    }

    if (snapshot.type === 'element' && snapshot.tagName && snapshot.nodeId) {
      const attributes = { ...snapshot.attributes };
      if (snapshot.className) {
        attributes.class = snapshot.className;
      }

      const element = this.domManager.createElement(snapshot.tagName, snapshot.nodeId, attributes);

      // 递归创建子节点
      if (snapshot.children) {
        snapshot.children.forEach(child => {
          const childElement = this.createElementFromSnapshot(child);
          if (childElement) {
            element.appendChild(childElement);
          }
        });
      }

      return element;
    }

    return null;
  }

  /**
   * 应用 DOM 操作
   */
  private applyOperations(operations: DOMOperation[]): void {
    operations.forEach(op => {
      try {
        switch (op.type) {
          case 'create':
            this.handleCreateOperation(op);
            break;
          case 'update':
            this.handleUpdateOperation(op);
            break;
          case 'delete':
            this.handleDeleteOperation(op);
            break;
          case 'move':
            this.handleMoveOperation(op);
            break;
        }
      } catch (error) {
        console.error('[StreamingRendererV2] Error applying operation:', op, error);
      }
    });
  }

  /**
   * 处理创建操作
   */
  private handleCreateOperation(op: DOMOperation): void {
    if (op.type !== 'create') return;

    const element = this.createElementFromSnapshot(op.node);
    if (!element) return;

    if (op.parent) {
      // 注意：DOMManagerV2 不支持按索引插入，暂时只能追加到末尾
      this.domManager.appendChild(op.parent, element);
    } else if (op.node.nodeId) {
      // 根节点，直接挂载到容器
      this.domManager.mountToContainer(op.node.nodeId);
    }
  }

  /**
   * 处理更新操作
   */
  private handleUpdateOperation(op: DOMOperation): void {
    if (op.type !== 'update') return;

    if (op.changes.textContent !== undefined) {
      this.domManager.updateTextContent(op.nodeId, op.changes.textContent);
    }

    if (op.changes.attributes) {
      this.domManager.updateAttributes(op.nodeId, op.changes.attributes);
    }

    if (op.changes.className) {
      // 更新 class 属性
      this.domManager.updateAttributes(op.nodeId, { class: op.changes.className });
    }
  }

  /**
   * 处理删除操作
   */
  private handleDeleteOperation(op: DOMOperation): void {
    if (op.type !== 'delete') return;
    this.domManager.removeNode(op.nodeId);
  }

  /**
   * 处理移动操作
   */
  private handleMoveOperation(op: DOMOperation): void {
    if (op.type !== 'move') return;

    const node = this.domManager.getNode(op.nodeId);
    if (!node) return;

    // 注意：DOMManagerV2 不支持按索引插入，暂时只能追加到末尾
    this.domManager.appendChild(op.newParent, node);
  }

  /**
   * 处理解析器结束
   */
  private handleParserEnd(): void {
    this.state = 'completed';

    if (this.debug) {
      console.log('[StreamingRendererV2] Rendering completed');
    }
  }

  /**
   * 写入字符
   */
  write(chunk: string): void {
    if (this.state === 'error') {
      throw new Error('Renderer is in error state');
    }

    if (this.state === 'idle') {
      this.state = 'rendering';
    }

    // 逐字符处理
    for (const char of chunk) {
      this.parser.processChar(char);
      this.inputCount++;
    }
  }

  /**
   * 结束渲染
   */
  end(): void {
    this.parser.end();
  }

  /**
   * 重置渲染器
   */
  reset(): void {
    this.state = 'idle';
    this.inputCount = 0;

    // 重置所有组件
    this.parser.reset();
    this.snapshotRenderer.reset();
    this.domDiff.reset();
    this.domManager.reset();

    // 重新初始化容器
    this.initializeContainer();
  }

  /**
   * 获取当前状态
   */
  getState(): RendererState {
    return this.state;
  }

  /**
   * 获取输入字符数
   */
  getInputCount(): number {
    return this.inputCount;
  }
}
