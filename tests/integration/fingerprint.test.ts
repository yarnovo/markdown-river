/**
 * 指纹测试
 * 使用预定义的输入输出对测试流式渲染器
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { loadAllTestCases } from './utils/test-case-loader';
import { runFingerprintTest, compareOutputs } from './utils/fingerprint-runner';
import { rmSync, existsSync } from 'fs';

// 测试用例目录
const CASES_DIR = join(__dirname, 'io-cases');

describe('流式 Markdown 渲染器指纹测试', () => {
  const testCases = loadAllTestCases(CASES_DIR);

  // 在所有测试开始前清理旧的实际输出
  beforeAll(() => {
    testCases.forEach(testCase => {
      const actualOutputsPath = join(testCase.path, 'actual-outputs');
      if (existsSync(actualOutputsPath)) {
        rmSync(actualOutputsPath, { recursive: true, force: true });
      }
    });
  });

  // 为每个测试用例生成一个测试
  testCases.forEach(testCase => {
    it(`${testCase.name}`, async () => {
      // 运行测试并生成实际输出
      const actualOutputs = await runFingerprintTest(
        testCase.path,
        testCase.input,
        testCase.config
      );

      // 比较预期输出和实际输出
      const result = compareOutputs(testCase.expectedOutputs, actualOutputs);

      if (!result.passed) {
        console.error(`\n❌ 测试失败于字符 ${result.failedAt}:`);
        console.error('预期:', result.diff?.expected);
        console.error('实际:', result.diff?.actual);
      }

      expect(result.passed).toBe(true);
    });
  });

  // 确保至少有一个测试用例
  it('应该至少有一个测试用例', () => {
    expect(testCases.length).toBeGreaterThan(0);
  });

  // 测试后不删除 actual-outputs，方便调试
  afterAll(() => {
    console.log('\n✅ 指纹测试完成');
    console.log('💡 提示: actual-outputs 目录已保留，方便调试');
  });
});
