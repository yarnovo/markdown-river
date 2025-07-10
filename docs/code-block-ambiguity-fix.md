# 代码块歧义检测问题解决方案

## 问题描述

当前的 StandardStrategy 在处理代码块时存在问题：

1. **症状**：当输入包含代码块标记（\`\`\`）时，解析器会卡住，一直等待代码块结束
2. **原因**：标准策略将单个反引号 \` 视为潜在的行内代码开始，导致持续的歧义状态
3. **影响**：用户在输入代码块时会看到内容停止渲染

## 问题分析

### 当前实现的问题

```typescript
// StandardStrategy.ts
hasAmbiguity(content: string, lastParsedIndex: number): boolean {
  const unparsed = content.slice(lastParsedIndex);

  // 检查是否有未闭合的格式符号
  const patterns = [
    { start: '**', end: '**' }, // 加粗
    { start: '*', end: '*' },    // 斜体
    { start: '_', end: '_' },    // 斜体
    { start: '`', end: '`' },    // 行内代码 <- 这里的问题
    { start: '[', end: ']' },    // 链接
  ];

  // ... 检测逻辑
}
```

问题在于：

- 将 \` 视为行内代码的开始/结束
- 没有区分行内代码（\`）和代码块（\`\`\`）
- 当遇到 \`\`\` 时，会认为第一个 \` 是未闭合的行内代码

### 测试用例

````javascript
// 问题场景
river.write('Here is a code block:');
river.write('\n```javascript'); // 这里会卡住
river.write('\nconst a = 1;');
river.write('\n```');
````

## 解决方案

### 方案一：改进歧义检测逻辑（推荐）

更智能地检测代码块和行内代码的区别：

````typescript
hasAmbiguity(content: string, lastParsedIndex: number): boolean {
  const unparsed = content.slice(lastParsedIndex);

  // 特殊处理代码块
  if (this.hasCodeBlockAmbiguity(unparsed)) {
    return true;
  }

  // 检查其他格式符号
  const patterns = [
    { start: '**', end: '**' },
    { start: '*', end: '*' },
    { start: '_', end: '_' },
    { start: '[', end: ']' },
  ];

  // ... 原有检测逻辑
}

private hasCodeBlockAmbiguity(text: string): boolean {
  // 检查是否有未闭合的代码块
  const codeBlockMatch = text.match(/```/g);
  if (codeBlockMatch && codeBlockMatch.length % 2 !== 0) {
    return true; // 奇数个 ``` 表示未闭合
  }

  // 检查行内代码
  // 排除代码块内的反引号
  const withoutCodeBlocks = text.replace(/```[\s\S]*?```/g, '');
  const inlineCodeMatch = withoutCodeBlocks.match(/`[^`\n]*$/);

  return !!inlineCodeMatch; // 有未闭合的行内代码
}
````

### 方案二：安全解析位置优化

在 `getSafeParseIndex` 中更智能地处理代码块：

````typescript
getSafeParseIndex(content: string, lastParsedIndex: number): number {
  const unparsed = content.slice(lastParsedIndex);

  // 检查是否在代码块中
  const codeBlockStart = unparsed.lastIndexOf('```');
  if (codeBlockStart !== -1) {
    // 查找代码块结束
    const afterStart = unparsed.slice(codeBlockStart + 3);
    const codeBlockEnd = afterStart.indexOf('```');

    if (codeBlockEnd === -1) {
      // 代码块未结束，等待更多输入
      return lastParsedIndex;
    }
  }

  // 原有逻辑...
  return lastParsedIndex;
}
````

### 方案三：策略模式扩展

创建专门处理代码的策略：

````typescript
export class CodeAwareStrategy implements ParseStrategy {
  hasAmbiguity(content: string, lastParsedIndex: number): boolean {
    const unparsed = content.slice(lastParsedIndex);

    // 优先检测代码块
    if (this.isInCodeBlock(content, lastParsedIndex)) {
      return !this.isCodeBlockClosed(unparsed);
    }

    // 其他格式检测
    return this.hasFormatAmbiguity(unparsed);
  }

  private isInCodeBlock(content: string, index: number): boolean {
    const beforeIndex = content.slice(0, index);
    const codeBlocks = beforeIndex.match(/```/g) || [];
    return codeBlocks.length % 2 !== 0;
  }

  private isCodeBlockClosed(text: string): boolean {
    return text.includes('```');
  }
}
````

## 实现建议

### 1. 短期修复（最小改动）

修改 `StandardStrategy.ts`，特殊处理代码块：

````typescript
// 在 hasAmbiguity 方法开始处添加
const unparsed = content.slice(lastParsedIndex);

// 特殊处理代码块
const codeBlockCount = (unparsed.match(/```/g) || []).length;
if (codeBlockCount % 2 !== 0) {
  return true; // 未闭合的代码块
}

// 处理行内代码时排除代码块
const withoutCodeBlocks = unparsed.replace(/```[\s\S]*?```/g, '');
// ... 继续原有逻辑，但使用 withoutCodeBlocks
````

### 2. 长期优化

1. **分离关注点**：将不同格式的歧义检测分离到独立方法
2. **配置化**：允许用户配置需要检测的格式类型
3. **性能优化**：缓存正则表达式，避免重复创建

## 测试计划

### 单元测试

````typescript
describe('StandardStrategy - Code Block Handling', () => {
  it('should handle code blocks without getting stuck', () => {
    const strategy = new StandardStrategy();

    // 代码块开始
    expect(strategy.hasAmbiguity('```javascript', 0)).toBe(true);

    // 代码块结束
    expect(strategy.hasAmbiguity('```javascript\ncode\n```', 0)).toBe(false);

    // 嵌套的反引号
    expect(strategy.hasAmbiguity('```\n`code`\n```', 0)).toBe(false);
  });

  it('should differentiate between inline code and code blocks', () => {
    const strategy = new StandardStrategy();

    // 行内代码
    expect(strategy.hasAmbiguity('This is `inline', 0)).toBe(true);
    expect(strategy.hasAmbiguity('This is `inline`', 0)).toBe(false);

    // 不应该被代码块干扰
    expect(strategy.hasAmbiguity('```\n`\n```', 0)).toBe(false);
  });
});
````

### 集成测试

````typescript
it('should render code blocks in streaming mode', async () => {
  const river = new MarkdownRiver();
  const results: string[] = [];

  river.on('content:parsed', ({ html }) => {
    results.push(html);
  });

  // 模拟流式输入
  const chunks = ['Here is code:\n', '```javascript\n', 'const a = 1;\n', 'const b = 2;\n', '```'];

  for (const chunk of chunks) {
    river.write(chunk);
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  river.end();

  // 验证最终输出包含正确的代码块
  const finalHtml = results[results.length - 1];
  expect(finalHtml).toContain('<pre><code class="language-javascript">');
  expect(finalHtml).toContain('const a = 1;');
});
````

## 推荐实现步骤

1. **第一步**：在 `StandardStrategy` 中添加代码块特殊处理
2. **第二步**：添加相关测试用例
3. **第三步**：在示例项目中验证修复效果
4. **第四步**：考虑是否需要更复杂的策略系统

## 注意事项

1. **向后兼容**：确保修改不影响现有功能
2. **性能影响**：避免过度的正则匹配
3. **边界情况**：考虑嵌套、转义等特殊情况
4. **用户体验**：确保修复后的行为符合用户预期
