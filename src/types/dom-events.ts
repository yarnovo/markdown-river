/**
 * DOM 管理器相关事件的数据类型定义
 */

import { BaseEventData } from './events';

/**
 * DOM 节点创建事件数据
 */
export interface DOMCreateEventData extends BaseEventData {
  /**
   * 创建的节点类型
   */
  nodeType: string;

  /**
   * 节点的唯一标识符
   */
  nodeId: string;

  /**
   * 父节点 ID（如果有）
   */
  parentId?: string;
}

/**
 * DOM 节点更新事件数据
 */
export interface DOMUpdateEventData extends BaseEventData {
  /**
   * 更新的节点 ID
   */
  nodeId: string;

  /**
   * 更新类型
   */
  updateType: 'text' | 'attribute' | 'style' | 'children';

  /**
   * 更新的具体内容
   */
  updates: Record<string, unknown>;
}

/**
 * DOM 节点删除事件数据
 */
export interface DOMRemoveEventData extends BaseEventData {
  /**
   * 删除的节点 ID
   */
  nodeId: string;

  /**
   * 是否递归删除子节点
   */
  recursive: boolean;
}

/**
 * DOM 批量更新事件数据
 */
export interface DOMBatchUpdateEventData extends BaseEventData {
  /**
   * 批次中的操作数量
   */
  operationCount: number;

  /**
   * 批次 ID
   */
  batchId: string;
}
