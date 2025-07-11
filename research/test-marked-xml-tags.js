import { marked } from 'marked';

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
