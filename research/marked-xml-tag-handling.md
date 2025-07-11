# Marked 库对 XML/HTML 标签的处理研究

## 研究目标

研究 marked 库对以下情况的处理方式：

1. 完整的 XML/HTML 标签（如 `<strong>xxxx</strong>`）
2. 不完整的标签（如 `<stron`）
3. 未闭合的标签（如 `<strong>xxsdf`）
4. 自定义扩展处理 XML 标记的能力

## 测试代码

```javascript
// test-marked-xml-tags.js
const { marked } = require('marked');

// 测试用例
const testCases = [
  {
    name: '完整的 HTML 标签',
    input: '<strong>完整标签内容</strong>',
    expected: '正常渲染为 HTML',
  },
  {
    name: '不完整的标签名',
    input: '<stron 这是不完整的标签',
    expected: '作为纯文本处理',
  },
  {
    name: '未闭合的标签',
    input: '<strong>未闭合的内容',
    expected: '根据 marked 的行为处理',
  },
  {
    name: '嵌套标签',
    input: '<div><strong>嵌套内容</strong></div>',
    expected: '正常渲染嵌套结构',
  },
  {
    name: '混合 Markdown 和 HTML',
    input: '**Markdown 加粗** 和 <strong>HTML 加粗</strong>',
    expected: '两种格式都应该正常工作',
  },
  {
    name: '自闭合标签',
    input: '<br/> 和 <hr/>',
    expected: '正常渲染自闭合标签',
  },
  {
    name: '属性中的特殊字符',
    input: '<a href="https://example.com">链接</a>',
    expected: '正常处理属性',
  },
  {
    name: '错误的标签格式',
    input: '<strong>内容</stron>',
    expected: '可能作为纯文本或部分渲染',
  },
];

// 测试默认行为
console.log('=== 默认 Marked 行为 ===\n');

testCases.forEach(testCase => {
  console.log(`测试: ${testCase.name}`);
  console.log(`输入: ${testCase.input}`);
  const result = marked(testCase.input);
  console.log(`输出: ${result}`);
  console.log(`期望: ${testCase.expected}`);
  console.log('---\n');
});

// 测试不同的配置选项
console.log('=== 不同配置选项 ===\n');

// 禁用 HTML
marked.setOptions({ breaks: false, gfm: true });
console.log('配置: 默认配置');
console.log(`输入: <strong>测试</strong>`);
console.log(`输出: ${marked('<strong>测试</strong>')}\n`);

// 自定义渲染器
const renderer = new marked.Renderer();

// 自定义 HTML 标签渲染
renderer.html = function (html) {
  console.log('捕获到 HTML:', html);

  // 检查是否是完整的标签
  const completeTagRegex = /<(\w+)([^>]*)>.*?<\/\1>/;
  const incompleteTagRegex = /<(\w+)(?![^>]*>)/;
  const unclosedTagRegex = /<(\w+)([^>]*)>(?!.*<\/\1>)/;

  if (completeTagRegex.test(html)) {
    // 完整标签，正常渲染
    return html;
  } else if (incompleteTagRegex.test(html)) {
    // 不完整标签，过滤掉
    return '';
  } else if (unclosedTagRegex.test(html)) {
    // 未闭合标签，显示原文
    return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return html;
};

marked.use({ renderer });

console.log('=== 自定义渲染器测试 ===\n');

const customTestCases = [
  '<strong>完整标签</strong>',
  '<stron 不完整',
  '<strong>未闭合',
  '<div><span>嵌套</span></div>',
];

customTestCases.forEach(input => {
  console.log(`输入: ${input}`);
  console.log(`输出: ${marked(input)}`);
  console.log('---\n');
});
```

## 研究发现

### 1. Marked 的默认行为

根据测试结果，marked 对 HTML 标签的默认处理行为如下：

1. **完整的 HTML 标签**（如 `<strong>内容</strong>`）
   - 正常渲染为 HTML：`<p><strong>内容</strong></p>`
   - 标签被保留并包裹在段落标签中

2. **不完整的标签名**（如 `<stron 内容`）
   - 被转义为纯文本：`<p>&lt;stron 内容</p>`
   - marked 能识别这不是有效的 HTML 标签

3. **未闭合的标签**（如 `<strong>未闭合内容`）
   - 标签被保留：`<p><strong>未闭合内容</p>`
   - marked 会输出未闭合的标签，让浏览器处理

4. **错误的闭合标签**（如 `<strong>内容</stron>`）
   - 开始标签正常渲染，错误的结束标签被保留：`<p><strong>内容</stron></p>`

5. **块级标签**（如 `<div>`）
   - 不被包裹在段落中，直接输出：`<div><strong>嵌套内容</strong></div>`

6. **自闭合标签**（如 `<br/>`、`<hr/>`）
   - 被包裹在段落中：`<p><br/> 和 <hr/></p>`

### 2. HTML 标签处理机制

Marked 在处理 HTML 时有以下特点：

1. **分离处理**：marked 将 HTML 标签分为块级和内联两种处理方式
2. **标签识别**：使用正则表达式识别有效的 HTML 标签格式
3. **自动转义**：对于无效的标签格式（如 `<stron`），会自动转义为 `&lt;stron`
4. **渲染器接口**：通过 `renderer.html()` 方法处理 HTML 内容，但接收的是包含元数据的对象而非纯文本

### 3. 自定义扩展能力

Marked 提供了多种扩展机制来自定义 HTML 标签处理：

#### 方法1：Tokenizer 扩展（最灵活）

```javascript
const customHtmlExtension = {
  name: 'customHtml',
  level: 'inline',
  tokenizer(src, tokens) {
    // 自定义解析逻辑
    // 可以精确控制如何识别和分类不同类型的标签
  },
  renderer(token) {
    // 根据 token 类型决定如何渲染
    if (token.complete) return token.raw;
    if (token.incomplete) return ''; // 过滤
    if (token.unclosed) return escape(token.raw); // 转义
  },
};
```

**优点**：

- 完全控制解析过程
- 可以添加自定义 token 属性
- 能够处理复杂的标签模式

**测试结果**：

- 完整标签：正常渲染
- 不完整标签（`<stron`）：成功过滤（不显示）
- 未闭合标签：成功转义显示

#### 方法2：Renderer 钩子

```javascript
const renderer = new marked.Renderer();
renderer.html = function (html) {
  // html 参数是一个包含元数据的对象
  // 需要处理 html.text 属性
};
```

**限制**：

- 接收的是对象而非字符串
- 标签已经被 marked 预处理
- 灵活性较低

#### 方法3：使用 `marked.use()` 配置

可以通过 `marked.use()` 方法组合多个扩展和配置。

### 4. 实现建议

基于研究结果，建议的实现方案：

1. **使用 Tokenizer 扩展**来实现自定义的 XML 标签处理逻辑
   - 完整标签：`<strong>xxx</strong>` → 正常渲染
   - 不完整标签：`<stron` → 过滤掉（不渲染）
   - 未闭合标签：`<strong>xxx` → 转义显示为 `&lt;strong&gt;xxx`

2. **关键实现点**：
   - 使用正则表达式精确匹配不同的标签模式
   - 在 tokenizer 中返回带有状态标记的 token
   - 在 renderer 中根据状态决定渲染策略

3. **注意事项**：
   - marked 会将某些 HTML 分离处理，需要同时处理 inline 和 block 级别
   - 自定义扩展的优先级高于默认处理
   - 需要考虑性能影响，避免过于复杂的正则表达式

### 5. 示例代码

完整的实现示例已在 `test-marked-extensions.js` 中提供，展示了如何：

- 识别完整、不完整和未闭合的标签
- 根据不同情况应用不同的渲染策略
- 集成到 marked 的处理流程中

## 相关文档

- [Marked 官方文档](https://marked.js.org/)
- [Marked 扩展开发指南](https://marked.js.org/using_pro#extensions)
- [Marked Renderer API](https://marked.js.org/using_pro#renderer)
