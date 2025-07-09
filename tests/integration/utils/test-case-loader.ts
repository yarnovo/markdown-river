/**
 * 测试用例加载器
 * 从文件系统加载测试用例数据
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { TestCaseData, TestCaseConfig } from '../types/test-case';

/**
 * 加载单个测试用例
 */
export function loadTestCase(casePath: string): TestCaseData {
  const name = casePath.split('/').pop() || 'unknown';

  // 加载输入文件
  const inputPath = join(casePath, 'input.md');
  if (!existsSync(inputPath)) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }
  const inputContent = readFileSync(inputPath, 'utf-8').trim();

  // 解析输入格式：支持逗号分隔的字符序列
  let input: string;
  if (inputContent.includes(',')) {
    // 逗号分隔格式：每个部分是一个输入单元
    input = inputContent.split(',').join('');
  } else {
    // 普通格式：整个内容作为输入
    input = inputContent;
  }

  // 加载配置（可选）
  const configPath = join(casePath, 'config.json');
  let config: TestCaseConfig | undefined;
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  }

  // 加载预期输出序列
  const outputsPath = join(casePath, 'expected-outputs');
  if (!existsSync(outputsPath)) {
    throw new Error(`预期输出目录不存在: ${outputsPath}`);
  }

  const outputFiles = readdirSync(outputsPath)
    .filter(f => f.endsWith('.html'))
    .sort();

  const expectedOutputs = outputFiles.map(file =>
    readFileSync(join(outputsPath, file), 'utf-8').trim()
  );

  // 确保输出数量与输入字符数匹配
  if (expectedOutputs.length !== input.length) {
    throw new Error(
      `输出文件数量 (${expectedOutputs.length}) 与输入字符数 (${input.length}) 不匹配`
    );
  }

  return {
    name,
    path: casePath,
    input,
    config,
    expectedOutputs,
  };
}

/**
 * 加载所有测试用例
 */
export function loadAllTestCases(casesDir: string): TestCaseData[] {
  if (!existsSync(casesDir)) {
    throw new Error(`测试用例目录不存在: ${casesDir}`);
  }

  const cases = readdirSync(casesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => join(casesDir, dirent.name));

  return cases.map(casePath => {
    try {
      return loadTestCase(casePath);
    } catch (error) {
      console.error(`加载测试用例失败: ${casePath}`, error);
      throw error;
    }
  });
}

/**
 * 保存测试用例的输出（用于生成预期结果）
 */
export function saveTestCaseOutputs(casePath: string, outputs: string[]): void {
  const outputsPath = join(casePath, 'expected-outputs');

  // 创建输出目录
  if (!existsSync(outputsPath)) {
    mkdirSync(outputsPath, { recursive: true });
  }

  // 保存每个输出
  outputs.forEach((output, index) => {
    const filename = `${String(index + 1).padStart(3, '0')}.html`;
    writeFileSync(join(outputsPath, filename), output);
  });
}
