# @markdown-river/test-suite

CommonMark 完整测试文档，包含所有 CommonMark 语法元素的 Markdown 字符串。

## 安装

```bash
npm install @markdown-river/test-suite
```

## 使用

```javascript
import { commonMarkFullDocument } from '@markdown-river/test-suite';
// 或使用默认导出
import testDocument from '@markdown-river/test-suite';

// 直接使用完整的 Markdown 文档进行测试
console.log(commonMarkFullDocument);

// 用于流式渲染测试
const river = new MarkdownRiver();
river.write(commonMarkFullDocument);
```

## 包含内容

这个文档包含了所有 CommonMark 语法元素：

- 标题（ATX 和 Setext 风格）
- 段落和换行
- 强调（斜体、加粗、组合）
- 列表（有序、无序、嵌套、任务列表）
- 代码（行内、缩进块、围栏块）
- 引用块（单层和嵌套）
- 链接（内联、引用式、自动）
- 图片
- 分隔线
- 转义字符
- HTML 实体和标签
- 表格（GFM 扩展）
- 删除线（GFM 扩展）
- 脚注（扩展语法）
- 特殊字符和边界情况

## License

ISC
