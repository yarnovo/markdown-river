# Marked 框架闪烁问题分析报告

## 概述

本报告基于 `tests/research/marked-commonmark-incomplete-syntax.test.ts` 的测试结果，分析 marked 框架在处理未完成 Markdown 语法时的行为，明确哪些场景会导致闪烁，以及我们的策略需要处理哪些情况。

## 闪烁问题的本质

闪烁发生在以下场景：

1. 用户输入的字符最初被渲染为普通文本
2. 当后续字符完成语法结构后，普通文本突然转换为格式化内容
3. 这种突变造成视觉上的闪烁

## Marked 框架的智能处理

### 1. 已经解决的场景（无需策略干预）

#### 代码块（Code Blocks）

````markdown
输入: ```
输出: <pre><code>\n</code></pre>
````

- **结论**：marked 会自动将未闭合的代码块视为完整代码块
- **优势**：用户输入 ``` 后立即看到代码块效果，无闪烁
- **策略**：不需要等待闭合标记

#### ATX 标题（Headers）

```markdown
输入: #
输出: <h1></h1>

输入: ## Hello
输出: <h2>Hello</h2>
```

- **结论**：单个井号即可触发标题渲染
- **优势**：标题效果立即显示，无闪烁
- **策略**：无需特殊处理

#### 引用块（Blockquotes）

```markdown
输入: >
输出: <blockquote>\n</blockquote>

输入: > text
输出: <blockquote>\n<p>text</p>\n</blockquote>
```

- **结论**：单个 > 符号即可形成引用块
- **优势**：引用效果立即显示
- **策略**：无需特殊处理

#### 分隔线（Horizontal Rules）

```markdown
输入: ---
输出: <hr>
```

- **结论**：三个符号即可形成分隔线
- **优势**：立即渲染，策略可直接决定
- **策略**：无需特殊处理

### 2. 需要策略处理的闪烁场景

#### 强调格式（Emphasis）

**问题表现**：

```markdown
用户输入过程：

1. - → 显示为 "\*"
2. *H → 显示为 "*H"
3. *He → 显示为 "*He"
4. _Hello_ → 突然变为斜体 "Hello"（闪烁！）
```

**marked 行为**：

```markdown
输入: *text
输出: <p>*text</p>

输入: _text_
输出: <p><em>text</em></p>
```

**策略需求**：检测未闭合的 `*` 和 `**`，延迟渲染直到闭合

#### 行内代码（Inline Code）

**问题表现**：

```markdown
用户输入过程：

1. ` → 显示为 "`"
2. `c → 显示为 "`c"
3. `code` → 突然变为代码样式（闪烁！）
```

**marked 行为**：

```markdown
输入: `code
输出: <p>`code</p>

输入: `code`
输出: <p><code>code</code></p>
```

**策略需求**：检测未闭合的反引号，延迟渲染

#### 链接（Links）

**问题表现**：

```markdown
用户输入过程：

1. [ → 显示为 "["
2. [text → 显示为 "[text"
3. [text] → 显示为 "[text]"
4. [text](url) → 突然变为链接（闪烁！）
```

**marked 行为**：

```markdown
输入: [text
输出: <p>[text</p>

输入: [text](url)
输出: <p><a href="url">text</a></p>
```

**策略需求**：检测未完成的链接语法

### 3. 特殊情况

#### 列表（Lists）

**复杂行为**：

```markdown
输入: -
输出: <ul>\n<li></li>\n</ul>

输入: -
输出: <p>- </p> （注意：空格后反而不是列表！）

输入: - item
输出: <ul>\n<li>item</li>\n</ul>
```

**分析**：列表的识别规则比较特殊，需要特别注意处理

## 策略实现建议

### 1. 需要策略决策的模式

```typescript
// StandardStrategy 应该决策的模式
const decisionPatterns = {
  // 行内强调
  singleAsterisk: /\*(?!\*)/, // 单个 * 后面不是 *
  doubleAsterisk: /\*\*(?!\*)/, // 两个 * 后面不是 *
  singleUnderscore: /_(?!_)/, // 单个 _ 后面不是 _
  doubleUnderscore: /__(?!_)/, // 两个 _ 后面不是 _

  // 行内代码
  backtick: /`(?!`)/, // 单个反引号

  // 链接和图片
  linkStart: /\[(?!.*\]\(.*\))/, // [ 但没有完整的 ](url)
  imageStart: /!\[(?!.*\]\(.*\))/, // ![ 但没有完整的 ](url)
};
```

### 2. 无需检测的模式（marked 已处理）

````typescript
// 这些模式 marked 能智能处理，不会闪烁
const smartHandledPatterns = {
  codeBlock: /```/, // 代码块
  header: /^#{1,6}\s/, // ATX 标题
  blockquote: /^>/, // 引用块
  hr: /^(-{3,}|\*{3,}|_{3,})$/, // 分隔线
};
````

### 3. 优化后的策略决策逻辑

````typescript
process(content: string, lastParsedIndex: number): number | string {
  const unparsed = content.slice(lastParsedIndex);

  // 1. 检查行内代码（排除代码块）
  const withoutCodeBlocks = unparsed.replace(/```/g, '');
  if ((withoutCodeBlocks.match(/`/g) || []).length % 2 !== 0) {
    // 策略决定：如果后面有内容则补全，否则等待
    return lastParsedIndex; // 决定保持当前位置或返回补全内容
  }

  // 2. 检查强调标记
  // 先处理双星号，避免与单星号混淆
  const afterDoubleAsterisk = unparsed.replace(/\*\*/g, '');
  if ((afterDoubleAsterisk.match(/\*/g) || []).length % 2 !== 0) {
    // 策略决定：返回补全内容或位置
    return content.length; // 或者返回补全后的字符串
  }

  // 3. 检查链接（简化版）
  if (unparsed.includes('[') && !unparsed.includes('](')) {
    // 策略决定：等待完整链接或补全
    return lastParsedIndex;
  }

  // 没有需要特殊处理的情况，策略决定解析到末尾
  return content.length;
}
````

## 结论

1. **Marked 已经很智能**：对于大多数块级元素，marked 能够智能处理未完成的语法，不会造成闪烁

2. **行内元素需要策略干预**：强调（`*`、`**`）、行内代码（`` ` ``）、链接（`[`）等行内元素需要我们的策略来避免闪烁

3. **策略设计原则**：
   - 对块级元素宽松（相信 marked 的能力）
   - 对行内元素保守（等待完整语法）
   - 特殊情况特殊处理（如列表）

4. **用户体验优先**：在保证不闪烁的前提下，尽可能快地显示内容，不要过度保守

通过这种策略，我们可以在 marked 的基础上，为用户提供完全无闪烁的流式 Markdown 渲染体验。
