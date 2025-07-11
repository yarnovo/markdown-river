import { parser as markdownParser } from '@lezer/markdown';
import { GFM } from '@lezer/markdown';
import { TreeFragment } from '@lezer/common';
import type { Tree } from '@lezer/common';

export interface ParseResult {
  tree: Tree;
}

export class MarkdownRiver {
  private parser;
  private content: string = '';
  private tree: Tree | null = null;
  private fragments: readonly TreeFragment[] = [];

  constructor() {
    // 初始化解析器，启用 GFM 扩展
    this.parser = markdownParser.configure([GFM]);
  }

  /**
   * 写入 Markdown 字符并返回最新的 AST
   * @param chunk 要写入的字符串
   * @returns 包含最新 AST 的结果对象
   */
  write(chunk: string): ParseResult {
    const oldLength = this.content.length;

    // 将新内容追加到现有文本
    this.content += chunk;

    if (this.tree && this.fragments.length > 0) {
      // 应用变更到 fragments
      // 正确的 change 格式：描述从旧文档到新文档的变更
      // fromA, toA: 在旧文档中的范围（这里是插入点）
      // fromB, toB: 在新文档中的范围（插入后的位置）
      const changes = [
        {
          fromA: oldLength, // 旧文档中的插入点
          toA: oldLength, // 旧文档中的插入点（相同表示插入）
          fromB: oldLength, // 新文档中对应的起始位置
          toB: this.content.length, // 新文档中对应的结束位置
        },
      ];

      // 使用较小的 minGap 值以允许更多的片段重用
      // 默认值是 128，这对于逐字符输入来说可能太大了
      this.fragments = TreeFragment.applyChanges(this.fragments, changes, 8);

      // 使用 fragments 进行增量解析
      this.tree = this.parser.parse(this.content, this.fragments);
    } else {
      // 首次解析
      this.tree = this.parser.parse(this.content);
    }

    // 更新 fragments
    // 只在首次解析或 fragments 为空时调用 addTree
    // 增量解析时，fragments 已经通过 applyChanges 更新，不需要再次替换
    if (this.fragments.length === 0) {
      this.fragments = TreeFragment.addTree(this.tree);
    }

    return {
      tree: this.tree,
    };
  }

  /**
   * 获取当前的完整文本
   */
  getText(): string {
    return this.content;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.content = '';
    this.tree = null;
    this.fragments = [];
  }
}
