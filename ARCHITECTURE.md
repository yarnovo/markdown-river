# Markdown River 架构设计文档

## 1. 系统概述

Markdown River 是一个专门解决流式 Markdown 渲染闪烁问题的前端库。它通过智能的增量解析和平滑的渲染调度，在保持流畅输出的同时避免格式符号的视觉闪烁。

### 1.1 设计目标

- **无闪烁渲染**：格式符号不会先显示后消失
- **流畅输出**：保持稳定的渲染速率，避免卡顿
- **高性能**：低延迟、高效率、内存友好
- **易扩展**：模块化设计，便于添加新功能
- **易集成**：简洁的 API，支持多种前端框架

### 1.2 核心理念

**与其事后修正，不如提前预判**

- 传统方案：像一个粗心的画家，画错了再涂掉重画（闪烁）
- 我们的方案：像一个经验丰富的画家，下笔前就知道要画什么（平滑）

## 2. 简化架构

### 2.1 架构概览

系统采用精简的三层架构，核心只有三个主要组件：

```
┌─────────────────────────────────────────────────┐
│              用户 API 接口                       │
├─────────────────────────────────────────────────┤
│                核心组件层                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────┐│
│  │ 缓冲管理器  │→ │  增量解析器  │→ │渲染调度│ │
│  │   (智能仓库) │  │  (聪明大脑)  │  │ (节奏) │ │
│  └─────────────┘  └──────────────┘  └────────┘│
├─────────────────────────────────────────────────┤
│                支撑模块层                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ 事件总线 │  │ DOM管理器│  │  样式处理器  │ │
│  └──────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────┘
```

### 2.2 数据流

```
输入流 → 缓冲管理器 → 增量解析器 → 令牌流 → 渲染调度器 → DOM更新 → 输出
           ↓              ↓             ↓           ↓            ↓
        事件总线 ←────────────────────────────────────────────────
```

## 3. 核心组件设计

### 3.1 缓冲管理器（BufferManager）

**职责**：管理流式输入的存储和读取

**核心特性**：

- 使用环形缓冲区，固定内存占用
- 支持回溯操作，可以重新读取之前的内容
- 自动覆盖最旧数据，防止内存溢出

**关键接口**：

```typescript
interface BufferManager {
  write(chunk: string): number; // 写入数据
  read(length?: number): string; // 读取数据
  peek(offset: number, length: number): string; // 查看数据
  backtrack(count: number): number; // 回溯
  clear(): void; // 清空
}
```

**实现要点**：

- 环形缓冲区通过取余运算实现循环
- 读写位置独立管理，支持并发操作
- 集成事件系统，通知数据变化

### 3.2 增量解析器（IncrementalParser）

**职责**：将字符流解析为 Markdown 令牌

**核心特性**：

- 维护解析状态机
- 生成"可能性令牌"而非确定性令牌
- 支持智能回溯和状态修正

**令牌类型示例**：

```typescript
enum TokenType {
  TEXT, // 普通文本
  POTENTIAL_BOLD, // 可能的加粗开始
  POTENTIAL_ITALIC, // 可能的斜体开始
  CONFIRMED_BOLD, // 确认的加粗
  CONFIRMED_ITALIC, // 确认的斜体
  // ...
}
```

**关键算法**：

1. **前瞻解析**：预测可能的格式标记
2. **延迟确认**：收集足够信息后再确认格式
3. **智能回溯**：判断错误时最小化修正范围

### 3.3 渲染调度器（RenderScheduler）

**职责**：控制令牌到 DOM 的输出节奏

**核心特性**：

- 批量处理令牌，减少 DOM 操作
- 保持稳定输出速率，避免卡顿
- 智能调节输出节奏

**调度策略**：

```typescript
interface SchedulerOptions {
  minInterval: number; // 最小渲染间隔
  maxBatchSize: number; // 最大批次大小
  smoothFactor: number; // 平滑因子
}
```

## 4. 支撑模块

### 4.1 事件总线（EventBus）

**作用**：实现模块间的松耦合通信

**特性**：

- 支持优先级
- 支持异步处理
- 支持条件过滤
- 自动内存管理

### 4.2 DOM 管理器（DOMManager）

**作用**：高效管理 DOM 操作

**特性**：

- 批量 DOM 更新
- 增量更新策略
- 虚拟节点缓存

### 4.3 样式处理器（StyleProcessor）

**作用**：管理 Markdown 元素的样式映射

**特性**：

- 支持自定义样式映射
- 兼容各种 CSS 框架
- 运行时动态更新

## 5. 核心流程示例

以输入 `**Hello**` 为例：

```
1. 缓冲阶段
   → 字符逐个进入缓冲区：* * H e l l o * *

2. 解析阶段
   → 检测到第一个 *：生成 POTENTIAL_EMPHASIS
   → 检测到第二个 *：升级为 POTENTIAL_BOLD
   → 检测到 Hello：继续收集
   → 检测到结束 **：确认为 CONFIRMED_BOLD

3. 调度阶段
   → 批量收集令牌
   → 计算最佳输出时机
   → 保持平滑输出

4. 渲染阶段
   → 创建 <strong> 元素
   → 应用样式
   → 更新 DOM
```

## 6. 性能优化策略

### 6.1 内存优化

- 环形缓冲区固定内存占用
- 对象池复用频繁创建的对象
- 及时清理不再需要的引用

### 6.2 计算优化

- 增量解析，避免重复计算
- 智能缓存解析结果
- 批量处理减少开销

### 6.3 渲染优化

- 批量 DOM 操作
- 使用 requestAnimationFrame
- 虚拟滚动支持大文档

## 7. 扩展性设计

### 7.1 插件系统

```typescript
interface Plugin {
  name: string;
  install(renderer: StreamingMarkdownRenderer): void;
  uninstall(): void;
}
```

### 7.2 自定义解析规则

```typescript
interface CustomRule {
  pattern: RegExp;
  parse(match: RegExpMatchArray): Token;
}
```

### 7.3 主题系统

```typescript
interface Theme {
  name: string;
  styles: Map<string, string>;
}
```

## 8. 集成示例

### 8.1 基础使用

```javascript
import { StreamingMarkdownRenderer } from 'markdown-river';

const renderer = new StreamingMarkdownRenderer({
  container: document.getElementById('output'),
  styleMap: new Map([
    ['strong', 'font-bold text-gray-900'],
    ['em', 'italic text-gray-700'],
  ]),
});

// 模拟流式输入
for (const char of text) {
  renderer.write(char);
  await sleep(10);
}
renderer.end();
```

### 8.2 React 集成

```jsx
import { useStreamingMarkdown } from 'markdown-river/react';

function ChatMessage({ stream }) {
  const { ref, write, end } = useStreamingMarkdown({
    styleMap: customStyles,
  });

  useEffect(() => {
    stream.on('data', write);
    stream.on('end', end);
  }, [stream]);

  return <div ref={ref} />;
}
```

## 9. 架构决策记录

### ADR-001: 选择环形缓冲区

- **决策**：使用环形缓冲区而非动态数组
- **原因**：固定内存占用，避免内存泄漏
- **权衡**：可能丢失过早的数据

### ADR-002: 可能性令牌系统

- **决策**：使用可能性令牌而非确定性令牌
- **原因**：支持智能预判和优雅回溯
- **权衡**：增加了解析器的复杂度

### ADR-003: 事件驱动架构

- **决策**：采用事件总线进行模块通信
- **原因**：降低耦合，提高可测试性
- **权衡**：轻微的性能开销

## 10. 未来规划

### 10.1 短期目标

- 完成核心模块实现
- 支持基础 Markdown 语法
- 发布 MVP 版本

### 10.2 中期目标

- 支持更多 Markdown 扩展语法
- 提供 React/Vue/Angular 适配器
- 性能优化和基准测试

### 10.3 长期愿景

- AI 驱动的智能预测
- 协作编辑支持
- 插件生态系统
