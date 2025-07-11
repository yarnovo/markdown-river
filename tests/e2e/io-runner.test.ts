import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { MarkdownRiver } from '../../src/core/MarkdownRiver.js';

interface TestCase {
  description: string;
  chunks: string[];
  expectedOutputs: string[];
}

describe('MarkdownRiver - IO 测试数据集', () => {
  const ioDir = join(__dirname, 'io');
  const testFiles = readdirSync(ioDir).filter(f => f.endsWith('.json'));

  testFiles.forEach(filename => {
    const filepath = join(ioDir, filename);
    const testCase: TestCase = JSON.parse(readFileSync(filepath, 'utf-8'));

    it(`${filename}: ${testCase.description}`, () => {
      const river = new MarkdownRiver();
      const htmlUpdates: string[] = [];

      // 注册监听器收集更新
      river.onHtmlUpdate(html => {
        htmlUpdates.push(html);
      });

      // 写入所有 chunks
      testCase.chunks.forEach(chunk => {
        river.write(chunk);
      });

      // 验证 HTML 更新序列
      expect(htmlUpdates).toEqual(testCase.expectedOutputs);
    });
  });
});
