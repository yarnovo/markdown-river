# Transformer 架构设计

## 概述

在 2025-07-10 的重构中，我们将 Markdown River 从策略模式（Strategy Pattern）迁移到了转换器模式（Transformer Pattern）。这个架构变更基于以下核心理念：

- **过滤单独的格式符号**：`*`、`**`、`` ` ``、`[` 等单独出现时被过滤掉
- **自动补全未闭合格式**：`*x` → `*x*`、`` `code`` → `` `code` ``、`[link` → `[link]()`

## 架构对比

### 旧架构（策略模式）

```
输入流 → 缓存管理 → 策略决策 → 解析位置/内容 → 解析器 → 输出
                      ↑                    ↓
                      └─── 歧义检测 ←─────┘
```

### 新架构（转换器模式）

```
输入流 → 缓存管理 → 转换器 → 解析器 → 输出
                      ↓
                 乐观更新规则
```

## 核心组件

### MarkdownTransformer

负责对流式输入的内容进行乐观转换：

```typescript
export class MarkdownTransformer {
  transform(content: string): string {
    // 1. 处理行内代码 `
    // 2. 处理加粗 **
    // 3. 处理斜体 *
    // 4. 处理链接 []
    // 5. 处理下划线格式 _ 和 __
  }
}
```

### 转换规则

1. **单独格式符号**：过滤掉
   - `Hello *` → `Hello `
   - `Text **` → `Text `

2. **未闭合格式**：自动补全
   - `Hello *world` → `Hello *world*`
   - `Text **bold` → `Text **bold**`
   - `Code `example`→`Code `example``
   - `Link [text` → `Link [text]()`

## 实现细节

### 计数检测法

使用计数方式检测未配对的格式符号：

```typescript
const backtickCount = (result.match(/`/g) || []).length;
if (backtickCount % 2 !== 0) {
  // 奇数个反引号，需要处理
}
```

### 嵌套格式处理

处理 `*` 和 `**` 的嵌套关系：

```typescript
// 先临时替换掉所有的 **
const tempResult = result.replace(/\*\*/g, '@@');
const singleStarCount = (tempResult.match(/\*/g) || []).length;
```

## 优势

1. **简单直接**：无需复杂的策略接口和歧义检测
2. **用户体验好**：即时反馈，无等待
3. **易于维护**：转换规则清晰，逻辑集中
4. **性能优秀**：每次输入只需要一次转换和解析

## 测试覆盖

- 单元测试：18 个测试用例覆盖各种转换场景
- 集成测试：验证与 MarkdownRiver 的集成
- E2E 测试：验证实际用户输入场景

## 迁移指南

如果你之前使用了策略模式的 API：

```typescript
// 旧代码
const river = new MarkdownRiver({
  strategy: new StandardStrategy(),
});

// 新代码 - 不再需要策略
const river = new MarkdownRiver();
```

策略相关的所有代码都已被移除，包括：

- `ParseStrategy` 接口
- `StandardStrategy` 类
- `strategy` 配置选项
