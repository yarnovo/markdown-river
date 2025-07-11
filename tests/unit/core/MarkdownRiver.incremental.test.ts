import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownRiver } from '../../../src/core/MarkdownRiver.js';

describe('MarkdownRiver 增量解析性能测试', () => {
  let river: MarkdownRiver;

  beforeEach(() => {
    river = new MarkdownRiver();
  });

  it('应该在增量解析时显示性能提升', () => {
    // 生成大文档
    const largeContent = '# Title\n\n' + 'This is a paragraph with some text. '.repeat(5000);
    console.log(`\n📊 增量解析性能测试 - 文档大小: ${largeContent.length} 字符`);

    // 测试1：首次解析
    const start1 = performance.now();
    river.write(largeContent);
    const time1 = performance.now() - start1;
    console.log(`  首次解析: ${time1.toFixed(2)}ms`);

    // 测试2：增量解析 - 追加少量内容
    const start2 = performance.now();
    river.write('\n\nNew paragraph added.');
    const time2 = performance.now() - start2;
    console.log(`  增量解析（追加一段）: ${time2.toFixed(2)}ms`);

    // 测试3：连续小增量
    const start3 = performance.now();
    for (let i = 0; i < 10; i++) {
      river.write(` More text ${i}.`);
    }
    const time3 = performance.now() - start3;
    console.log(`  10次小增量: ${time3.toFixed(2)}ms`);

    // 验证增量解析应该更快
    expect(time2).toBeLessThan(time1);
    console.log(`  ✅ 增量解析比首次解析快 ${((1 - time2 / time1) * 100).toFixed(1)}%`);
  });

  it('对比：有无增量解析的性能差异', () => {
    const largeContent = '# Title\n\n' + 'This is a paragraph with some text. '.repeat(5000);
    console.log(`\n📊 有无增量解析对比测试`);

    // 场景1：使用增量解析
    const river1 = new MarkdownRiver();
    river1.write(largeContent);
    const start1 = performance.now();
    river1.write('\n\nNew paragraph added.');
    const incrementalTime = performance.now() - start1;

    // 场景2：不使用增量解析（模拟每次都重新解析全部）
    const river2 = new MarkdownRiver();
    const fullContent = largeContent + '\n\nNew paragraph added.';
    const start2 = performance.now();
    river2.write(fullContent);
    const fullParseTime = performance.now() - start2;

    console.log(`  增量解析: ${incrementalTime.toFixed(2)}ms`);
    console.log(`  完整解析: ${fullParseTime.toFixed(2)}ms`);
    console.log(`  性能提升: ${((1 - incrementalTime / fullParseTime) * 100).toFixed(1)}%`);

    // 增量解析在大多数情况下应该更快或至少相当
    // 由于 Markdown 解析本身很快，性能提升可能不太明显
    if (incrementalTime < fullParseTime) {
      console.log('  ✅ 增量解析更快');
    } else {
      console.log('  ⚠️  增量解析未显示明显优势（可能因为文档较小）');
    }
    expect(incrementalTime).toBeLessThan(fullParseTime * 1.5); // 至少不应该慢太多
  });

  it('增量解析的正确性验证', () => {
    // 分步构建文档
    river.write('# Hello\n\n');
    river.write('This is a paragraph.\n\n');
    river.write('- Item 1\n');
    river.write('- Item 2\n');
    river.write('\n**Bold text**');

    // 获取最终的 AST
    const result = river.write(' and *italic*');
    const tree = result.tree;

    // 验证树结构
    expect(tree).toBeDefined();
    expect(tree.type.name).toBe('Document');

    // 验证内容
    const content = river.getText();
    expect(content).toBe(
      '# Hello\n\nThis is a paragraph.\n\n- Item 1\n- Item 2\n\n**Bold text** and *italic*'
    );
  });

  it('大文档增量解析的实际场景', () => {
    console.log(`\n📊 实际场景测试：模拟流式输入`);

    // 模拟实际的流式 Markdown 输入
    const chunks = [
      '# 项目文档\n\n',
      '## 简介\n\n',
      '这是一个用于演示增量解析的项目。',
      '它可以处理流式输入的 Markdown 文本，',
      '并且通过增量解析技术提高性能。\n\n',
      '## 特性\n\n',
      '- **增量解析**：只解析新增的内容\n',
      '- **高性能**：适合大文档\n',
      '- **流式处理**：支持逐块输入\n\n',
      '## 使用方法\n\n',
      '```javascript\n',
      'const river = new MarkdownRiver();\n',
      'river.write(chunk);\n',
      '```\n\n',
      '更多信息请参考 [文档](https://example.com)。',
    ];

    const times: number[] = [];
    let totalTime = 0;

    // 逐块写入并记录时间
    chunks.forEach(chunk => {
      const start = performance.now();
      river.write(chunk);
      const time = performance.now() - start;
      times.push(time);
      totalTime += time;
    });

    // 计算平均时间和标准差
    const avgTime = totalTime / chunks.length;
    const variance =
      times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    console.log(`  总块数: ${chunks.length}`);
    console.log(`  总时间: ${totalTime.toFixed(2)}ms`);
    console.log(`  平均每块: ${avgTime.toFixed(2)}ms`);
    console.log(`  标准差: ${stdDev.toFixed(2)}ms`);
    console.log(`  最快: ${Math.min(...times).toFixed(2)}ms`);
    console.log(`  最慢: ${Math.max(...times).toFixed(2)}ms`);

    // 验证性能稳定性
    expect(stdDev).toBeLessThan(avgTime * 2); // 标准差应该在合理范围内
  });

  it('重置后的性能应该与首次解析相同', () => {
    const content = '# Test\n\n' + 'Paragraph. '.repeat(1000);

    // 首次解析
    const start1 = performance.now();
    river.write(content);
    const time1 = performance.now() - start1;

    // 重置
    river.reset();

    // 重置后解析
    const start2 = performance.now();
    river.write(content);
    const time2 = performance.now() - start2;

    // 时间应该相近
    const ratio = time2 / time1;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(2.0);

    console.log(`\n📊 重置测试`);
    console.log(`  首次解析: ${time1.toFixed(2)}ms`);
    console.log(`  重置后解析: ${time2.toFixed(2)}ms`);
    console.log(`  时间比例: ${ratio.toFixed(2)}`);
  });

  it('连续小增量的性能稳定性', () => {
    const largeContent = '# Title\n\n' + 'This is a paragraph with some text. '.repeat(5000);
    console.log(`\n📊 连续小增量性能测试`);

    // 首次解析大文档
    river.write(largeContent);

    const incrementTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      river.write(` Chunk ${i}.`);
      incrementTimes.push(performance.now() - start);
    }

    // 验证每次增量都很快
    const maxTime = Math.max(...incrementTimes);
    const avgTime = incrementTimes.reduce((a, b) => a + b, 0) / incrementTimes.length;

    console.log(`  最大时间: ${maxTime.toFixed(2)}ms`);
    console.log(`  平均时间: ${avgTime.toFixed(2)}ms`);
    console.log(`  所有增量: [${incrementTimes.map(t => t.toFixed(2)).join(', ')}]`);

    expect(maxTime).toBeLessThan(20); // 每次增量都应该在20ms以内
    expect(avgTime).toBeLessThan(15); // 平均应该更快
  });

  it('应该正确处理跨块的 Markdown 结构', () => {
    console.log(`\n📊 跨块 Markdown 结构测试`);

    // 测试1：代码块跨越多次写入
    river.write('```javascript\n');
    river.write('const x = 1;\n');
    river.write('const y = 2;\n');
    const result1 = river.write('```');

    expect(result1.tree).toBeDefined();
    expect(river.getText()).toBe('```javascript\nconst x = 1;\nconst y = 2;\n```');

    // 测试2：列表跨越多次写入
    river.reset();
    river.write('- Item 1\n');
    river.write('  continued line\n');
    river.write('- Item 2\n');
    const result2 = river.write('  with details');

    expect(result2.tree).toBeDefined();
    expect(river.getText()).toBe('- Item 1\n  continued line\n- Item 2\n  with details');

    // 测试3：标题和段落
    river.reset();
    river.write('# Main Title\n\n');
    river.write('First paragraph starts here');
    river.write(' and continues here.\n\n');
    const result3 = river.write('Second paragraph.');

    expect(result3.tree).toBeDefined();
    console.log('  ✅ 跨块结构解析正确');
  });

  it('性能基准：不同文档大小的增量解析效率', () => {
    console.log(`\n📊 不同文档大小的增量解析性能基准`);

    const sizes = [1000, 5000, 10000, 20000];
    const results = sizes.map(size => {
      river.reset();
      const content = 'This is a test sentence. '.repeat(size);

      // 首次解析
      const t1 = performance.now();
      river.write(content);
      const initialTime = performance.now() - t1;

      // 增量解析
      const t2 = performance.now();
      river.write(' New content added.');
      const incrementalTime = performance.now() - t2;

      return {
        size: size * 25, // 每个句子约25字符
        initialTime,
        incrementalTime,
        ratio: incrementalTime / initialTime,
      };
    });

    // 打印结果表格
    console.log('  文档大小 | 首次解析 | 增量解析 | 比例');
    console.log('  ---------|----------|----------|------');
    results.forEach(r => {
      console.log(
        `  ${(r.size / 1000).toFixed(0)}KB`.padEnd(9) +
          '|' +
          ` ${r.initialTime.toFixed(2)}ms`.padEnd(10) +
          '|' +
          ` ${r.incrementalTime.toFixed(2)}ms`.padEnd(10) +
          '|' +
          ` ${(r.ratio * 100).toFixed(1)}%`
      );
    });

    // 验证增量解析的相对性能
    const ratios = results.map(r => r.ratio);
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    console.log(`\n  平均比例: ${(avgRatio * 100).toFixed(1)}%`);

    // 对于小文档，增量解析可能不会更快，但不应该慢太多
    // 对于大文档，增量解析应该显示出优势
    const largeDocRatio = results[results.length - 1].ratio;
    console.log(`  最大文档增量比例: ${(largeDocRatio * 100).toFixed(1)}%`);

    // 验证大文档的增量解析不会慢太多
    expect(largeDocRatio).toBeLessThan(1.5);
  });
});
