import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { MarkdownRiver } from '../../src/core/MarkdownRiver';

// E2E 测试数据接口定义
interface E2ETestInput {
  chunks: string[];
  timing: 'sequential' | 'batch';
}

interface E2ETestStep {
  after_chunk: number;
  description: string;
  parsed_content: string;
  display_html: string;
  strategy_decision: 'wait' | 'complete' | 'parse_to_position';
  reason: string;
}

interface E2ETestExpected {
  steps: E2ETestStep[];
  final_state: {
    total_chunks_processed: number;
    final_display: string;
    strategy_calls: number;
  };
}

interface E2ETestCase {
  name: string;
  description: string;
  input: E2ETestInput;
  expected: E2ETestExpected;
  // 添加文件路径信息用于错误报告
  _filePath?: string;
}

// 加载所有 IO 测试数据
function loadE2ETestCases(): E2ETestCase[] {
  const ioDir = join(__dirname, 'io');
  const files = readdirSync(ioDir).filter(file => file.endsWith('.json'));

  return files.map(file => {
    const content = readFileSync(join(ioDir, file), 'utf-8');
    const testCase = JSON.parse(content) as E2ETestCase;
    testCase._filePath = file; // 添加文件路径信息
    return testCase;
  });
}

// 执行端到端测试的辅助函数
async function executeE2ETest(testCase: E2ETestCase): Promise<{
  results: Array<{
    chunkIndex: number;
    html: string;
    content: string;
    timestamp: number;
  }>;
  strategyCalls: number;
  finalHtml: string;
}> {
  const river = new MarkdownRiver();
  const results: Array<{
    chunkIndex: number;
    html: string;
    content: string;
    timestamp: number;
  }> = [];

  let strategyCalls = 0;

  // 监听解析事件
  river.on('content:parsed', data => {
    results.push({
      chunkIndex: results.length,
      html: data.html,
      content: data.content,
      timestamp: data.timestamp,
    });
  });

  // 模拟用户逐块输入
  for (let i = 0; i < testCase.input.chunks.length; i++) {
    const chunk = testCase.input.chunks[i];
    river.write(chunk);
    strategyCalls++;

    // 检查当前步骤的期望结果
    const expectedStep = testCase.expected.steps.find(step => step.after_chunk === i);
    if (expectedStep) {
      // 验证当前状态
      const latestResult = results[results.length - 1];

      if (expectedStep.strategy_decision === 'wait') {
        // 如果策略决定等待，应该没有新的解析结果或者结果为空
        try {
          if (latestResult) {
            expect(latestResult.html).toBe(expectedStep.display_html);
          } else {
            expect(expectedStep.display_html).toBe('');
          }
        } catch (error) {
          console.error(`❌ E2E测试失败 - ${testCase.name}`);
          console.error(`📁 JSON文件: ${testCase._filePath || '未知'}`);
          console.error(`📍 失败步骤: after_chunk=${i} (输入第${i + 1}个字符: "${chunk}")`);
          console.error(`🎯 期望策略: ${expectedStep.strategy_decision}`);
          console.error(`💭 期望原因: ${expectedStep.reason}`);
          console.error(`📄 期望HTML: ${JSON.stringify(expectedStep.display_html)}`);
          console.error(
            `📄 实际HTML: ${latestResult ? JSON.stringify(latestResult.html) : 'undefined'}`
          );
          console.error(`🔄 累积输入: "${testCase.input.chunks.slice(0, i + 1).join('')}"`);
          throw error;
        }
      } else if (expectedStep.strategy_decision === 'complete') {
        // 如果策略决定补全，应该有新的解析结果
        try {
          expect(latestResult).toBeDefined();
          expect(latestResult.html).toBe(expectedStep.display_html);
        } catch (error) {
          console.error(`❌ E2E测试失败 - ${testCase.name}`);
          console.error(`📁 JSON文件: ${testCase._filePath || '未知'}`);
          console.error(`📍 失败步骤: after_chunk=${i} (输入第${i + 1}个字符: "${chunk}")`);
          console.error(`🎯 期望策略: ${expectedStep.strategy_decision}`);
          console.error(`💭 期望原因: ${expectedStep.reason}`);
          console.error(`📄 期望HTML: ${JSON.stringify(expectedStep.display_html)}`);
          console.error(
            `📄 实际HTML: ${latestResult ? JSON.stringify(latestResult.html) : 'undefined'}`
          );
          console.error(`🔄 累积输入: "${testCase.input.chunks.slice(0, i + 1).join('')}"`);
          throw error;
        }
      }
    }
  }

  // 结束流式输入
  river.end();

  return {
    results,
    strategyCalls,
    finalHtml: results.length > 0 ? results[results.length - 1].html : '',
  };
}

describe('端到端测试 (E2E)', () => {
  const testCases = loadE2ETestCases();

  testCases.forEach(testCase => {
    describe(testCase.name, () => {
      it(testCase.description, async () => {
        const result = await executeE2ETest(testCase);

        // 验证最终状态
        try {
          expect(result.finalHtml).toBe(testCase.expected.final_state.final_display);
          expect(result.strategyCalls).toBe(testCase.expected.final_state.strategy_calls);
          expect(testCase.input.chunks.length).toBe(
            testCase.expected.final_state.total_chunks_processed
          );
        } catch (error) {
          console.error(`❌ E2E最终状态验证失败 - ${testCase.name}`);
          console.error(`📁 JSON文件: ${testCase._filePath || '未知'}`);
          console.error(
            `📄 期望最终HTML: ${JSON.stringify(testCase.expected.final_state.final_display)}`
          );
          console.error(`📄 实际最终HTML: ${JSON.stringify(result.finalHtml)}`);
          console.error(`🔢 期望策略调用次数: ${testCase.expected.final_state.strategy_calls}`);
          console.error(`🔢 实际策略调用次数: ${result.strategyCalls}`);
          console.error(`🔢 期望处理块数: ${testCase.expected.final_state.total_chunks_processed}`);
          console.error(`🔢 实际输入块数: ${testCase.input.chunks.length}`);
          throw error;
        }
      });

      it(`${testCase.description} - 详细步骤验证`, async () => {
        const river = new MarkdownRiver();
        const stepResults: string[] = [];

        river.on('content:parsed', data => {
          stepResults.push(data.html);
        });

        // 逐步验证每个输入后的状态
        for (let i = 0; i < testCase.input.chunks.length; i++) {
          const chunk = testCase.input.chunks[i];
          river.write(chunk);

          const expectedStep = testCase.expected.steps.find(step => step.after_chunk === i);
          if (expectedStep) {
            const currentHtml = stepResults[stepResults.length - 1] || '';

            // 详细验证步骤描述中的期望
            console.log(`Step ${i}: ${expectedStep.description}`);
            console.log(`Expected: ${expectedStep.display_html}`);
            console.log(`Actual: ${currentHtml}`);
            console.log(`Reason: ${expectedStep.reason}`);
            console.log('---');

            try {
              expect(currentHtml).toBe(expectedStep.display_html);
            } catch (error) {
              console.error(`❌ E2E详细步骤验证失败 - ${testCase.name}`);
              console.error(`📁 JSON文件: ${testCase._filePath || '未知'}`);
              console.error(`📍 失败步骤: after_chunk=${i} (输入第${i + 1}个字符: "${chunk}")`);
              console.error(`💭 期望原因: ${expectedStep.reason}`);
              console.error(`📄 期望HTML: ${JSON.stringify(expectedStep.display_html)}`);
              console.error(`📄 实际HTML: ${JSON.stringify(currentHtml)}`);
              console.error(`🔄 累积输入: "${testCase.input.chunks.slice(0, i + 1).join('')}"`);
              throw error;
            }
          }
        }

        river.end();
      });
    });
  });
});
