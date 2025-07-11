import { marked } from 'marked';

console.log('=== Marked 扩展机制研究 ===\n');

// 1. 使用 Tokenizer 扩展处理自定义标签
const customHtmlExtension = {
  name: 'customHtml',
  level: 'inline',
  start(src) {
    return src.indexOf('<');
  },
  tokenizer(src) {
    // 匹配各种 HTML 标签模式
    const completeTag = /^<(\w+)([^>]*)>(.*?)<\/\1>/;
    const selfClosingTag = /^<(\w+)([^>]*)\s*\/>/;
    const unclosedTag = /^<(\w+)([^>]*)>(?!.*<\/\1>)/;
    // const incompleteTag = /^<(\w+)\s+[^>]*$/;
    const malformedTag = /^<(\w+)[^>]*$/;

    let match;

    // 完整标签
    if ((match = completeTag.exec(src))) {
      return {
        type: 'customHtml',
        raw: match[0],
        tag: match[1],
        attrs: match[2],
        content: match[3],
        complete: true,
      };
    }

    // 自闭合标签
    if ((match = selfClosingTag.exec(src))) {
      return {
        type: 'customHtml',
        raw: match[0],
        tag: match[1],
        attrs: match[2],
        selfClosing: true,
        complete: true,
      };
    }

    // 未闭合标签
    if ((match = unclosedTag.exec(src))) {
      const endOfTag = src.indexOf('>');
      if (endOfTag !== -1) {
        return {
          type: 'customHtml',
          raw: src.substring(0, endOfTag + 1),
          tag: match[1],
          attrs: match[2],
          unclosed: true,
          complete: false,
        };
      }
    }

    // 不完整标签（没有 >）
    if ((match = malformedTag.exec(src))) {
      // 找到下一个空格或换行
      const endMatch = src.match(/^<\w+[^\s>]*/);
      if (endMatch) {
        return {
          type: 'customHtml',
          raw: endMatch[0],
          tag: match[1],
          incomplete: true,
          complete: false,
        };
      }
    }

    return false;
  },
  renderer(token) {
    if (token.complete) {
      // 完整标签，正常渲染
      return token.raw;
    } else if (token.incomplete) {
      // 不完整标签，过滤掉（不渲染）
      return '';
    } else if (token.unclosed) {
      // 未闭合标签，转义显示
      return token.raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    return token.raw;
  },
};

// 2. 使用渲染器钩子
const hookExtension = {
  name: 'hookExtension',
  renderer: {
    html(text) {
      console.log('HTML 钩子捕获:', text);

      // 如果是对象，取其 text 属性
      if (typeof text === 'object' && text.text) {
        text = text.text;
      }

      // 简单的标签检测
      if (text.match(/^<(\w+)([^>]*)>$/)) {
        // 只是开始标签
        return text;
      } else if (text.match(/^<\/(\w+)>$/)) {
        // 只是结束标签
        return text;
      } else if (text.match(/^<[^>]+$/)) {
        // 不完整标签，过滤
        return '';
      }

      return text;
    },
  },
};

// 3. 测试不同的扩展方式
console.log('方法1: 使用 Tokenizer 扩展\n');

marked.use({ extensions: [customHtmlExtension] });

const testCases = [
  '<strong>完整标签</strong>',
  '<stron 不完整标签',
  '<strong>未闭合标签',
  '<br/>',
  '<div class="test">带属性的标签</div>',
  '普通文本 <strong>混合</strong> 内容',
];

testCases.forEach(input => {
  console.log(`输入: ${input}`);
  const result = marked.parseInline(input);
  console.log(`输出: ${result}`);
  console.log('---');
});

// 4. 测试渲染器钩子方式
console.log('\n方法2: 使用渲染器钩子\n');

// 重置 marked
marked.setOptions({
  renderer: new marked.Renderer(),
  breaks: false,
  gfm: true,
});

marked.use(hookExtension);

testCases.forEach(input => {
  console.log(`输入: ${input}`);
  const result = marked(input);
  console.log(`输出: ${result}`);
  console.log('---');
});

// 5. 创建一个更复杂的扩展示例
console.log('\n方法3: 完整的自定义标签处理器\n');

const advancedHtmlHandler = {
  name: 'advancedHtml',
  level: 'block',
  renderer: {
    paragraph(text) {
      // 在段落级别处理 HTML 标签
      const processedText = text
        .replace(/<(\w+)([^>]*)>(.*?)<\/\1>/g, match => {
          // 完整标签，保留
          return match;
        })
        .replace(/<(\w+)\s+[^>]*$/g, () => {
          // 不完整标签，过滤
          return '';
        })
        .replace(/<(\w+)([^>]*)>(?!.*<\/\1>)/g, match => {
          // 未闭合标签，转义
          return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        });

      return `<p>${processedText}</p>\n`;
    },
  },
};

// 重置并使用新扩展
marked.setOptions({
  renderer: new marked.Renderer(),
  breaks: false,
  gfm: true,
});
marked.use(advancedHtmlHandler);

console.log('高级处理器测试:');
testCases.forEach(input => {
  console.log(`输入: ${input}`);
  const result = marked(input);
  console.log(`输出: ${result}`);
  console.log('---');
});
