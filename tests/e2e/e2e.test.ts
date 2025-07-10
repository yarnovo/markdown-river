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
}

// 加载所有 IO 测试数据
function loadE2ETestCases(): E2ETestCase[] {
  const ioDir = join(__dirname, 'io');
  const files = readdirSync(ioDir).filter(file => file.endsWith('.json'));

  return files.map(file => {
    const content = readFileSync(join(ioDir, file), 'utf-8');
    return JSON.parse(content) as E2ETestCase;
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
        if (latestResult) {
          expect(latestResult.html).toBe(expectedStep.display_html);
        } else {
          expect(expectedStep.display_html).toBe('');
        }
      } else if (expectedStep.strategy_decision === 'complete') {
        // 如果策略决定补全，应该有新的解析结果
        expect(latestResult).toBeDefined();
        expect(latestResult.html).toBe(expectedStep.display_html);
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
        expect(result.finalHtml).toBe(testCase.expected.final_state.final_display);
        expect(result.strategyCalls).toBe(testCase.expected.final_state.strategy_calls);

        // 验证处理的块数量
        expect(testCase.input.chunks.length).toBe(
          testCase.expected.final_state.total_chunks_processed
        );
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

            expect(currentHtml).toBe(expectedStep.display_html);
          }
        }

        river.end();
      });
    });
  });
});
