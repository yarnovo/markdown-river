# 让 AI 聊天不再"闪烁"：Markdown River 的故事

## 一、问题：令人抓狂的闪烁

### 1.1 场景重现

想象一下这个场景：

你正在使用 ChatGPT 或其他 AI 助手，它正在回答你的问题。突然，你看到：

```
屏幕上先出现：**
然后又出现：**重要
接着变成：**重要内容
最后突然变成：重要内容（加粗）
```

星号消失了！这种"闪烁"让人很不舒服。

### 1.2 为什么会闪烁？

让我们用一个生活化的例子：

想象你在听一个人说话：

- 他说："星号"
- 你想：他是真的要说星号这个符号吗？
- 他继续说："星号重要内容星号"
- 你恍然大悟：哦！他是要强调"重要内容"！

**传统渲染器就像你一样**：听到什么就显示什么，直到"恍然大悟"才改变显示。

### 1.3 问题的本质

```
传统方式的困境：
收到 "*" → 不知道是什么 → 只能显示星号
收到 "*text" → 还是不确定 → 继续显示
收到 "*text*" → 哦！是斜体！→ 赶紧改成斜体（闪烁！）
```

**核心问题**：渲染器缺少"预判"能力，它需要更多上下文才能做出正确判断。

## 二、我们的解决方案：智能缓存

### 2.1 核心思路：像聪明的编辑

Markdown River 就像一个聪明的编辑：

**传统渲染器**：像现场直播，看到什么播什么
**Markdown River**：像录播剪辑，理解了再播出

### 2.2 智能判断机制

想象 Markdown River 内部有个"智能编辑"，他的工作方式：

```
已发表内容：Hello
缓存内容：Hello *

编辑想：末尾有个 *，这是什么意思？
- 可能是斜体开始
- 可能就是个星号
决定：有歧义！先不发表这个 *

又来了 "world"：
缓存内容：Hello *world
编辑想：还是不确定，继续等

又来了 "*"：
缓存内容：Hello *world*
编辑想：哦！是斜体格式！
决定：发表斜体的 world
```

### 2.3 关键概念解释

用进度条来理解：

```
整个内容：[====================] 100%
已解析部分：[==========          ] 50%
未解析部分：[          ==========] 50%（有歧义，等待中）
```

- **缓存**：保存所有内容（整个进度条）
- **已解析**：确定格式的部分（绿色部分）
- **未解析**：还不确定的部分（灰色部分）

**工作原理**：

1. 新内容加入缓存
2. 检查末尾是否有歧义
3. 有歧义就等待，无歧义就解析
4. 解析后的内容立即输出

## 三、实际效果对比

### 3.1 简单示例：斜体文本

**传统渲染器**：

```
时间  显示内容         用户看到
0ms   *               一个星号
10ms  *H              星号和H
20ms  *Hello          星号和Hello
30ms  *Hello*         突然变成斜体（闪烁！）
```

**Markdown River**：

```
时间  缓存内容        已解析/显示
0ms   *               （空）
10ms  *H              （空）
20ms  *Hello          （空）
30ms  *Hello*         斜体的Hello（完美！）
```

### 3.2 复杂示例：嵌套格式

想象输入：`**[链接](url)**`

**传统渲染器的混乱过程**：

- 显示两个星号
- 然后加上方括号
- 然后显示链接文字
- 最后才意识到整体是加粗的链接

**Markdown River 的优雅处理**：

- 一直等待，直到看到完整格式
- 一次性显示：**[链接](url)**（加粗的链接）

### 3.3 为什么没有"超时"？

你可能会问：如果一直有歧义，不是会一直等待吗？

**答案**：在实际场景中，歧义总会消除

- 格式符号总是成对出现
- 或者遇到换行、空格等自然边界
- 最差情况：用户调用 end()，强制解析

## 四、如何使用

### 4.1 最简单的使用

```javascript
// 创建实例
const river = new MarkdownRiver({
  strategy: 'standard', // 标准 Markdown 策略
});

// 监听输出
river.on('content:parsed', ({ html }) => {
  document.getElementById('output').innerHTML = html;
});

// 流式输入
river.write('**Hello');
river.write(' World**');

// 结束时强制输出
river.end();
```

### 4.2 在 React 中使用

```jsx
function ChatMessage() {
  const { write, end, content } = useMarkdownRiver();

  useEffect(() => {
    // 接收 AI 流式响应
    aiStream.on('data', chunk => write(chunk));
    aiStream.on('end', () => end());
  }, []);

  return <div>{content}</div>;
}
```

### 4.3 自定义策略

````javascript
// 自定义策略：根据需求调整歧义判断
const customStrategy = {
  hasAmbiguity(content, lastParsedIndex) {
    const unparsed = content.slice(lastParsedIndex);
    // 根据你的需求定制歧义检测逻辑
    // 例如：只检测代码块的歧义
    return unparsed.includes('```') && !unparsed.match(/```[\s\S]*```/);
  },
  getSafeParseIndex(content, lastParsedIndex) {
    // 自定义安全解析位置的计算
    return lastParsedIndex;
  },
};

const river = new MarkdownRiver({
  strategy: customStrategy,
});
````

## 五、设计哲学

### 5.1 三个核心原则

**1. 理解优先**

- 不是"快"就是好
- 理解了再显示，避免闪烁

**2. 全量判断**

- 基于完整上下文做决策
- 而不是只看局部

**3. 用户可控**

- 提供 end() 方法
- 用户可以随时结束等待

### 5.2 为什么这样设计有效

想象两种看电影的方式：

**方式 A（传统）**：
网络不好，视频一卡一卡的，画面音声不同步，体验很差。

**方式 B（Markdown River）**：
缓冲一小段再播放，虽然开始慢了一点，但播放流畅，体验很好。

我们选择了方式 B！

## 六、技术细节

### 6.1 歧义检测示例

```javascript
// 简化的歧义检测
function hasAmbiguity(content, lastParsedIndex) {
  // 策略可以访问全量内容
  // 但通常只需要检查未解析部分
  const unparsed = content.slice(lastParsedIndex);

  // 也可以结合已解析部分做更智能的判断
  const parsed = content.slice(0, lastParsedIndex);

  // 检查未闭合的格式符号
  const patterns = [
    /\*[^*]*$/, // 未闭合的 *
    /\*\*[^*]*$/, // 未闭合的 **
    /`[^`]*$/, // 未闭合的 `
    /\[[^\]]*$/, // 未闭合的 [
  ];

  return patterns.some(pattern => pattern.test(unparsed));
}
```

### 6.2 解析位置管理

```javascript
class MarkdownRiver {
  constructor() {
    this.cache = ''; // 全量内容
    this.lastParsedIndex = 0; // 已解析位置
  }

  write(chunk) {
    this.cache += chunk;
    this.tryParse();
  }

  tryParse() {
    if (!this.hasAmbiguity()) {
      // 解析从 lastParsedIndex 到末尾的内容
      const newContent = this.cache.slice(this.lastParsedIndex);
      this.emit('content:parsed', { content: newContent });
      this.lastParsedIndex = this.cache.length;
    }
  }
}
```

## 七、常见问题

### Q: 会不会等待太久？

A: 实际使用中，歧义很快就会消除。而且用户可以随时调用 end() 结束等待。

### Q: 为什么不设置超时？

A: 因为歧义判断是确定性的，要么有歧义，要么没有。超时反而会导致不必要的闪烁。

### Q: 性能会不会有问题？

A: 不会。歧义检测只是简单的字符串匹配，非常快。虽然策略接收全量内容，但它知道上次解析的位置，可以智能地判断需要检测的范围。

## 八、总结

Markdown River 通过"智能缓存"解决了 AI 时代的一个真实痛点：

**问题**：流式 Markdown 渲染的闪烁
**原因**：缺少上下文，过早显示
**方案**：全量缓存 + 歧义检测
**效果**：彻底消除闪烁

就像这句话说的：

> "宁可慢一点点，也要呈现完美。"

如果你也在做 AI 应用，试试 Markdown River，让你的用户享受无闪烁的阅读体验！

---

_GitHub: [markdown-river](https://github.com/yourusername/markdown-river)_
_npm: `npm install markdown-river`_
