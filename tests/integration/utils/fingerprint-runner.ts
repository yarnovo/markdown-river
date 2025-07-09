/**
 * 指纹测试运行器
 * 负责运行测试用例并生成实际输出
 */

import { StreamingMarkdownRenderer } from '../../../src/streaming-markdown-renderer';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import type { TestCaseConfig } from '../types/test-case';

/**
 * 运行测试用例并生成实际输出
 */
export async function runFingerprintTest(
  casePath: string,
  input: string,
  config?: TestCaseConfig
): Promise<string[]> {
  // 创建容器
  const container = document.createElement('div');
  container.id = 'content';
  document.body.appendChild(container);

  const outputs: string[] = [];

  try {
    // 处理配置
    const rendererConfig: {
      container: HTMLElement;
      enableMetrics?: boolean;
      debug?: boolean;
      bufferDelay?: number;
      styleMap?: Map<string, string>;
    } = {
      container,
      enableMetrics: config?.enableMetrics,
      debug: config?.debug,
      bufferDelay: config?.bufferDelay,
    };

    // 转换 styleMap
    if (config?.styleMap) {
      rendererConfig.styleMap = new Map(Object.entries(config.styleMap));
    }

    // 创建渲染器
    const renderer = new StreamingMarkdownRenderer(rendererConfig);

    // 逐字符输入
    for (let i = 0; i < input.length; i++) {
      renderer.write(input[i]);

      // 等待渲染
      const inputDelay = config?.inputDelay ?? 10;
      await new Promise(resolve => setTimeout(resolve, inputDelay));

      // 记录输出（只包含 container 的内容）
      outputs.push(container.innerHTML);
    }

    // 结束输入
    renderer.end();
    await new Promise(resolve => setTimeout(resolve, 50));

    // 保存实际输出
    const actualOutputsPath = join(casePath, 'actual-outputs');
    mkdirSync(actualOutputsPath, { recursive: true });

    outputs.forEach((output, index) => {
      const fileName = `${String(index + 1).padStart(3, '0')}.html`;
      writeFileSync(join(actualOutputsPath, fileName), output);
    });

    return outputs;
  } finally {
    // 清理
    container.remove();
  }
}

/**
 * 比较预期输出和实际输出
 */
export function compareOutputs(
  expectedOutputs: string[],
  actualOutputs: string[]
): { passed: boolean; failedAt?: number; diff?: { expected: string; actual: string } } {
  if (expectedOutputs.length !== actualOutputs.length) {
    return {
      passed: false,
      failedAt: Math.min(expectedOutputs.length, actualOutputs.length),
      diff: {
        expected: `${expectedOutputs.length} outputs`,
        actual: `${actualOutputs.length} outputs`,
      },
    };
  }

  for (let i = 0; i < expectedOutputs.length; i++) {
    if (expectedOutputs[i] !== actualOutputs[i]) {
      return {
        passed: false,
        failedAt: i,
        diff: {
          expected: expectedOutputs[i],
          actual: actualOutputs[i],
        },
      };
    }
  }

  return { passed: true };
}
