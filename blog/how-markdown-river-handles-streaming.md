# 揭秘 Markdown River：如何优雅地处理 AI 流式输出的不确定性

在上一篇文章中，我们介绍了 Markdown River 的整体架构。今天，让我们深入探讨一个核心问题：**当 AI 一个字符一个字符地发送内容时，我们是如何做到平滑渲染，又是如何处理预判错误的？**

## 一、真实的 AI 输出场景

### 1.1 AI 输出的特点

首先，让我们看看 AI 实际是怎么输出的：

```
时间轴 →
0ms:   *
15ms:  *
18ms:  H
32ms:  e
35ms:  l
40ms:  l
45ms:  o
200ms: *  (注意这里间隔突然变长)
215ms: *
```

关键点：

- **间隔不固定**：大部分时候间隔 10-50ms，但偶尔会有 200ms+ 的延迟
- **突发性**：有时候会突然来一串字符
- **不可预测**：你永远不知道下一个字符什么时候来

### 1.2 我们要解决的核心矛盾

矛盾在于：

1. 看到 `**` 时，我们不知道这是不是加粗的开始
2. 如果立即显示星号 → 可能会闪烁
3. 如果等待确认 → 可能会卡顿
4. 等多久才算"确认失败"？这是个难题

## 二、Markdown River 的解决方案

### 2.1 核心思路：智能缓冲窗口

我们的方案不是简单的"等待"或"立即显示"，而是建立了一个**智能缓冲窗口**。

想象一个这样的场景：

- 你在看直播，主播在写字
- 但直播有 2-3 秒延迟
- 这个延迟让我们有机会"预处理"内容

### 2.2 具体实现：三个关键组件

#### 1. 输入缓冲区（Input Buffer）

```javascript
class InputBuffer {
  private buffer: string[] = [];
  private timestamps: number[] = [];

  push(char: string) {
    this.buffer.push(char);
    this.timestamps.push(Date.now());
  }
}
```

每个字符进来时，我们记录：

- 字符本身
- 到达时间

#### 2. 模式识别器（Pattern Recognizer）

这是最聪明的部分：

```javascript
class PatternRecognizer {
  // 可能的格式标记状态
  private potentialMarkers = {
    bold: { pattern: '**', state: 'idle', startPos: -1 },
    italic: { pattern: '*', state: 'idle', startPos: -1 },
    code: { pattern: '`', state: 'idle', startPos: -1 }
  };

  analyze(buffer: string[], position: number) {
    const char = buffer[position];

    // 看到第一个 *
    if (char === '*' && this.potentialMarkers.bold.state === 'idle') {
      this.potentialMarkers.bold.state = 'watching';
      this.potentialMarkers.bold.startPos = position;
      return { action: 'HOLD', reason: 'potential_bold_start' };
    }

    // 看到第二个 *
    if (char === '*' &&
        this.potentialMarkers.bold.state === 'watching' &&
        position === this.potentialMarkers.bold.startPos + 1) {
      this.potentialMarkers.bold.state = 'confirmed_start';
      return { action: 'EMIT_TOKEN', token: { type: 'BOLD_START' } };
    }
  }
}
```

#### 3. 输出调度器（Output Scheduler）

这是控制输出节奏的关键：

```javascript
class OutputScheduler {
  private outputQueue: Token[] = [];
  private lastOutputTime = 0;
  private targetInterval = 30; // 目标输出间隔 30ms

  schedule() {
    const now = Date.now();
    const timeSinceLastOutput = now - this.lastOutputTime;

    // 智能调整输出速率
    if (this.outputQueue.length > 10) {
      // 队列积压，加快输出
      this.targetInterval = 20;
    } else if (this.outputQueue.length < 3) {
      // 队列较空，放慢输出
      this.targetInterval = 40;
    }

    if (timeSinceLastOutput >= this.targetInterval) {
      this.flush();
    }
  }
}
```

## 三、处理预判错误：超时机制

### 3.1 什么时候算"判断错误"？

关键在于定义合理的超时时间。我们使用**自适应超时**：

```javascript
class AdaptiveTimeout {
  private recentIntervals: number[] = []; // 最近的字符间隔

  calculateTimeout(): number {
    if (this.recentIntervals.length < 5) {
      return 150; // 默认 150ms
    }

    // 计算平均间隔
    const avgInterval = this.recentIntervals.reduce((a, b) => a + b) / this.recentIntervals.length;

    // 超时时间 = 平均间隔的 3-5 倍
    return Math.min(avgInterval * 4, 200);
  }
}
```

### 3.2 具体的回溯流程

让我们看一个具体例子：

**场景**：输入 `**Hello` 但后面没有结束的 `**`

```
时间线：
0ms:    收到 * → 进入 watching 状态
15ms:   收到 * → 确认是 bold_start，但先不输出
30ms:   收到 H → 继续缓冲
45ms:   收到 e → 继续缓冲
60ms:   收到 l → 继续缓冲
75ms:   收到 l → 继续缓冲
90ms:   收到 o → 继续缓冲
...
250ms:  超时！判断这不是加粗格式

回溯处理：
1. 将缓冲的 "**Hello" 作为普通文本
2. 生成 TEXT 令牌序列
3. 按照目标速率平滑输出
```

### 3.3 为什么用户感知不到回溯？

关键在于**输出延迟**：

```
实际输入时间线：    0ms  15ms  30ms  45ms  60ms  75ms  90ms ... 250ms
                  *    *     H     e     l     l     o         [超时]

用户看到的时间线：                                              250ms  280ms  310ms
                                                              *      *      H ...
```

因为我们有缓冲延迟，所以：

1. 用户还没看到任何内容时，我们就已经知道这不是加粗
2. 直接输出普通文本，用户看到的是平滑的打字效果
3. 没有"先显示再修改"的闪烁

## 四、速率控制的精妙之处

### 4.1 动态速率调整

输出速率不是固定的，而是根据多个因素动态调整：

```javascript
class DynamicRateController {
  calculateOutputRate() {
    // 因素1：输入速率
    const inputRate = this.measureInputRate();

    // 因素2：缓冲区压力
    const bufferPressure = this.outputQueue.length / this.maxQueueSize;

    // 因素3：内容复杂度
    const complexity = this.estimateComplexity();

    // 综合计算
    let targetRate = 30; // 基础 30ms 间隔

    if (bufferPressure > 0.7) {
      targetRate *= 0.8; // 加快 20%
    } else if (bufferPressure < 0.3) {
      targetRate *= 1.2; // 放慢 20%
    }

    // 确保输出始终平滑
    return this.smoothTransition(this.currentRate, targetRate);
  }
}
```

### 4.2 智能预测

基于历史模式预测未来：

```javascript
class SmartPredictor {
  predict(context: string) {
    // 如果前面都是普通文本，后续大概率也是
    if (!context.includes('*') && !context.includes('`')) {
      return { likelyPlainText: true };
    }

    // 如果刚结束一个格式，短期内不太可能立即开始新格式
    if (this.recentlyClosedFormat) {
      return { likelyPlainText: true, confidence: 0.8 };
    }
  }
}
```

## 五、实战案例分析

### 案例 1：正常的加粗文本

输入：`**Hello World**`

```
处理流程：
1. 0-15ms: 收到 **，识别为潜在加粗开始，缓冲
2. 15-120ms: 收到 "Hello World"，确认前面是加粗，继续缓冲
3. 120-150ms: 收到 **，确认加粗结束
4. 150ms开始: 平滑输出整个加粗文本块

用户看到：[加粗的 Hello World] 平滑出现
```

### 案例 2：误判的星号

输入：`**这是两个星号但没有结束`

```
处理流程：
1. 0-15ms: 收到 **，识别为潜在加粗，缓冲
2. 15-200ms: 收到后续文本，等待结束标记
3. 250ms: 超时，判断为普通文本
4. 250ms开始: 平滑输出 "**这是两个星号但没有结束"

用户看到：普通文本平滑出现，没有闪烁
```

### 案例 3：快速突发输入

输入：`Normal text **bold** more text`（突然快速到达）

```
处理流程：
1. 0-10ms: 快速收到大量字符
2. 解析器快速分析，识别出完整的格式结构
3. 输出调度器检测到队列压力，适当加快输出
4. 但仍保持平滑，不会突然倾倒所有内容

用户看到：内容以稍快但仍平滑的速度出现
```

## 六、关键技术总结

### 6.1 三个核心机制

1. **智能缓冲**：不是死板的固定延迟，而是根据上下文智能决定
2. **自适应超时**：根据实际输入速率动态调整超时阈值
3. **平滑输出**：无论内部如何处理，输出始终保持平滑

### 6.2 为什么这样设计有效

1. **利用了延迟**：把"缺点"变成"优点"
2. **统计规律**：大部分情况下，格式标记都是成对且相近的
3. **用户心理**：用户更在意平滑性，而不是绝对的实时性

### 6.3 边界情况处理

- **网络抖动**：自适应超时能够应对
- **格式嵌套**：状态机能够处理复杂情况
- **错误恢复**：始终能够优雅降级

## 七、总结

Markdown River 的核心创新在于：

1. **不追求"立即正确"**：接受短暂的不确定性
2. **智能缓冲换取确定性**：用可接受的延迟换取正确性
3. **始终保持平滑**：这是用户体验的关键

记住：用户看到的流畅效果，背后是精心设计的缓冲、预测和调度机制在协同工作。我们不是在"实时"渲染，而是在"近实时"地智能渲染。

这种设计理念也可以应用到其他需要处理流式、不确定输入的场景中。关键是找到合适的平衡点：既不能延迟太多影响体验，也不能太着急导致频繁修正。

---

_下一篇文章，我们将深入探讨 Markdown River 的状态机设计，看看它如何处理复杂的嵌套格式。_
