/* eslint-disable no-irregular-whitespace */

/**
 * CommonMark 测试文档套件
 * 包含所有 CommonMark 语法元素的模块化示例
 */

// 标题和段落
export const headingsAndParagraphs = `# CommonMark 标题和段落示例

## 标题 (Headings)

# H1 一级标题
## H2 二级标题
### H3 三级标题
#### H4 四级标题
##### H5 五级标题
###### H6 六级标题

Setext 风格标题
===============

Setext 二级标题
---------------

## 段落 (Paragraphs)

这是第一个段落。段落之间需要用空行分隔。
这一行仍然属于第一个段落。

这是第二个段落。段落可以包含多行文本，
只要它们之间没有空行，就会被合并为同一个段落。

## 换行 (Line Breaks)

使用两个空格加换行可以创建硬换行：  
这是新的一行。

或者使用反斜杠：\\
这也是新的一行。`;

// 强调和格式
export const emphasisAndFormatting = `# 强调和格式示例

## 强调 (Emphasis)

*斜体文本* 或 _斜体文本_

**加粗文本** 或 __加粗文本__

***斜体加粗*** 或 ___斜体加粗___

**加粗文本中包含 _斜体_ 文本**

*斜体文本中包含 __加粗__ 文本*

## 删除线（GFM 扩展）

~~删除的文本~~

## 转义字符 (Escaping)

使用反斜杠转义特殊字符：

\\*不是斜体\\*

\\[不是链接\\]

\\# 不是标题

可以转义的字符：
\\! \\# \\$ \\% \\& \\' \\( \\) \\* \\+ \\, \\- \\. \\/ \\: \\; \\< \\= \\> \\? \\@ \\[ \\\\ \\] \\^ \\_ \\\` \\{ \\| \\} \\~`;

// 列表
export const listsAndTasks = `# 列表示例

## 列表 (Lists)

### 无序列表

- 第一项
- 第二项
- 第三项

* 使用星号
* 也可以

+ 使用加号
+ 同样可以

### 有序列表

1. 第一项
2. 第二项
3. 第三项

1) 使用括号
2) 也可以

### 嵌套列表

1. 第一项
   - 嵌套项 1
   - 嵌套项 2
     - 更深层嵌套
     - 继续嵌套
   - 嵌套项 3
2. 第二项
   1. 嵌套有序列表
   2. 第二个有序项
3. 第三项

### 任务列表（GFM 扩展）

- [x] 已完成任务
- [ ] 未完成任务
- [x] 另一个已完成任务`;

// 代码
export const codeBlocks = `# 代码示例

## 代码 (Code)

### 行内代码

使用 \`反引号\` 创建行内代码。

包含反引号的代码：\`\`code with \` backtick\`\`

### 代码块（缩进式）

    这是一个缩进代码块
    需要 4 个空格或 1 个制表符
    可以包含多行

### 代码块（围栏式）

\`\`\`
普通代码块
可以包含多行
不指定语言
\`\`\`

\`\`\`javascript
// 带语言标识的代码块
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}

hello("World");
\`\`\`

\`\`\`python
# Python 代码示例
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
\`\`\``;

// 引用和分隔线
export const quotesAndRules = `# 引用和分隔线示例

## 引用块 (Blockquotes)

> 这是一个引用块。
> 可以包含多行。

> 引用块可以嵌套
>> 这是嵌套的引用
>>> 更深层的嵌套

> ## 引用中的标题
> 
> 引用块中可以包含其他 Markdown 元素：
> 
> - 列表项 1
> - 列表项 2
> 
> \`代码\` 也可以在引用中使用。

## 分隔线 (Horizontal Rules)

三个或更多的符号：

---

***

___

带空格也可以：

- - -

* * *`;

// 链接和图片
export const linksAndImages = `# 链接和图片示例

## 链接 (Links)

### 内联链接

[链接文本](https://example.com)

[带标题的链接](https://example.com "链接标题")

### 引用式链接

[引用式链接][ref1]

[数字引用][1]

[链接文本本身]

[ref1]: https://example.com "引用链接标题"
[1]: https://example.com/numeric
[链接文本本身]: https://example.com/self

### 自动链接

<https://example.com>

<user@example.com>

## 图片 (Images)

### 内联图片

![图片描述](https://via.placeholder.com/150 "图片标题")

### 引用式图片

![引用式图片][img1]

[img1]: https://via.placeholder.com/150 "引用图片标题"`;

// 高级特性
export const advancedFeatures = `# 高级特性示例

## HTML 实体和标签

HTML 实体：&copy; &amp; &lt; &gt; &quot; &#39;

<div>
  <p>HTML 标签在 CommonMark 中是允许的</p>
  <span style="color: red;">红色文本</span>
</div>

## 表格（GFM 扩展）

| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 单元格1 | 单元格2  | 单元格3 |
| 左     | 中       | 右     |

简化的表格：

列1 | 列2 | 列3
--- | --- | ---
A   | B   | C
1   | 2   | 3

## 脚注（扩展语法）

这里有一个脚注[^1]。

这是另一个脚注[^note]。

[^1]: 这是第一个脚注的内容。

[^note]: 这是命名脚注的内容。
    可以包含多个段落。
    
    甚至可以包含代码块。

## 定义列表（扩展语法）

术语 1
:   定义 1

术语 2
:   定义 2a
:   定义 2b`;

// 边界情况测试
export const edgeCases = `# 边界情况测试

## 特殊字符处理

Unicode 字符：你好世界 🌍 😊 🚀

零宽字符测试：这里​有​零​宽​空​格

特殊空格：
- 普通空格: | |
- 不间断空格: | |
- 全角空格: |　|

## 混合嵌套示例

> ### 引用中的列表和代码
> 
> 1. **加粗的列表项**
>    - *斜体的子项*
>    - 包含 \`行内代码\` 的子项
> 
> \`\`\`javascript
> // 引用块中的代码块
> const x = 42;
> \`\`\`

## 空元素

空列表项：
- 
- 非空项
- 

空引用块：
>
> 非空引用

## 特殊组合

***加粗斜体***文本后面紧跟普通文本

行内代码\`code\`后面紧跟文本

[链接](url)后面紧跟[另一个链接](url2)

## 未闭合的格式

这是一个包含 *未闭合斜体 的段落

这是一个包含 **未闭合加粗 的段落

这是一个包含 \`未闭合代码 的段落

## 极长内容测试

这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的段落，用于测试换行处理。

\`这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的行内代码\``;

// 完整文档（拼接所有模块）
export const commonMarkFullDocument = [
  headingsAndParagraphs,
  emphasisAndFormatting,
  listsAndTasks,
  codeBlocks,
  quotesAndRules,
  linksAndImages,
  advancedFeatures,
  edgeCases,
  '\n---\n\n*文档结束*',
].join('\n\n');

// 测试用例配置
export const testCases = {
  完整文档: commonMarkFullDocument,
  标题和段落: headingsAndParagraphs,
  强调和格式: emphasisAndFormatting,
  列表和任务: listsAndTasks,
  代码块: codeBlocks,
  引用和分隔线: quotesAndRules,
  链接和图片: linksAndImages,
  高级特性: advancedFeatures,
  边界情况: edgeCases,
};

// 为了向后兼容，保留默认导出
export default commonMarkFullDocument;
