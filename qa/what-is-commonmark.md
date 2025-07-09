# 什么是 CommonMark？

## 一句话解释

CommonMark 是 Markdown 的标准化规范，就像"普通话"之于各地方言，它定义了 Markdown 语法的统一标准。

## 为什么需要 CommonMark？

想象一下这个场景：

你在 A 网站写了一篇 Markdown 文章，里面有这样的内容：

```markdown
1. 第一项

- 子项目
  - 更深的子项目

2. 第二项
```

在 A 网站上显示得很完美，但当你把同样的内容复制到 B 网站时，格式却乱了！为什么？因为不同的 Markdown 解析器对某些语法的理解不一样。

这就像不同地方的方言，虽然都是中文，但有时候会产生误解。CommonMark 就是来解决这个问题的"普通话"。

## CommonMark 的历史

- **2004年**：John Gruber 创建了 Markdown
- **问题出现**：原始 Markdown 规范有很多模糊的地方，导致不同实现差异很大
- **2014年**：一群 Markdown 贡献者发布了 CommonMark，提供清晰无歧义的规范
- **2024年**：最新版本是 0.31.2（2024年1月28日发布）

## CommonMark 解决了哪些问题？

### 1. 嵌套列表的缩进

**模糊情况**：

```markdown
- 项目1
  - 子项目（用2个空格？）
    - 子项目（用4个空格？）
```

**CommonMark 规定**：使用 2-4 个空格都可以，但要保持一致。

### 2. 强调符号的处理

**模糊情况**：

```markdown
**加粗**文本\*\*
**加粗**文本\_\_
```

**CommonMark 规定**：明确定义了开始和结束标记的配对规则。

### 3. HTML 标签的处理

**模糊情况**：Markdown 中能否使用 HTML？怎么用？

**CommonMark 规定**：明确定义了哪些 HTML 可以使用，如何与 Markdown 混合。

## 谁在使用 CommonMark？

许多大型平台都采用了 CommonMark：

- **GitHub**：GitHub Flavored Markdown (GFM) 基于 CommonMark
- **GitLab**：支持 CommonMark
- **Reddit**：使用 CommonMark
- **Stack Overflow**：采用 CommonMark
- **Discourse**：论坛软件，使用 CommonMark

## CommonMark 与 Markdown River 的关系

在我们的 Markdown River 项目中，我们需要：

1. **遵循 CommonMark 规范**：确保解析器符合标准
2. **处理流式输入**：在遵循规范的同时，处理逐字符输入的特殊情况
3. **预判机制**：基于 CommonMark 规范预判可能的标记

举个例子：

```markdown
当我们收到 "\*\*" 时，根据 CommonMark 规范，我们知道：

- 这可能是加粗的开始
- 也可能是两个普通的星号
- 需要看后续内容才能确定
```

## CommonMark 规范的核心内容

### 1. 块级元素

- 段落
- 标题（ATX 和 Setext 两种风格）
- 代码块（缩进式和围栏式）
- 引用块
- 列表（有序和无序）
- 分隔线

### 2. 行内元素

- 强调（斜体和加粗）
- 链接
- 图片
- 行内代码
- 换行

### 3. 优先级规则

CommonMark 明确定义了当多种解释都可能时的优先级。

## 实际例子：CommonMark 如何消除歧义

### 例子1：列表后的缩进

```markdown
1. 列表项

   这是列表项的继续还是新段落？
```

**旧 Markdown**：不同解析器有不同理解
**CommonMark**：明确规定需要 3 个空格的缩进才能成为列表项的继续

### 例子2：强调符号的嵌套

```markdown
*这是 *嵌套* 的强调吗？*
```

**旧 Markdown**：结果不确定
**CommonMark**：有明确的左右侧规则来判断

## 如何学习 CommonMark？

1. **官方网站**：https://commonmark.org/
2. **规范文档**：https://spec.commonmark.org/
3. **在线试验场**：https://spec.commonmark.org/dingus/
4. **参考实现**：提供 C 和 JavaScript 的参考实现

## 总结

CommonMark 就像是 Markdown 世界的"国标"，它：

- 📏 提供统一的标准
- 🔍 消除语法歧义
- 🧪 包含 500+ 测试用例
- 🌍 被广泛采用

对于 Markdown River 这样的项目，理解和遵循 CommonMark 规范是基础，但我们还需要在此基础上解决流式渲染的特殊挑战。

记住：**CommonMark 是规范，不是实现**。它告诉我们"应该怎样"，而具体"怎么做"则是每个解析器需要解决的问题。
