# Markdown River 架构设计文档

## 1. 系统概述

Markdown River 是一个专门解决流式 Markdown 渲染闪烁问题的前端库。它通过智能的增量解析和平滑的渲染调度，在保持流畅输出的同时避免格式符号的视觉闪烁。

### 1.1 设计目标

- **无闪烁渲染**：格式符号不会先显示后消失
- **流畅输出**：保持稳定的渲染速率，避免卡顿
- **高性能**：低延迟、高效率、内存友好
- **易扩展**：模块化设计，便于添加新功能
- **易集成**：简洁的 API，支持多种前端框架

### 1.2 核心挑战

1. **状态管理**：维护跨多次输入的解析状态
2. **性能平衡**：在准确性和响应速度间找到平衡
3. **回溯处理**：最小化对已渲染内容的修改
4. **样式灵活性**：支持自定义样式映射

## 2. 整体架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        应用层 (Application)                   │
├─────────────────────────────────────────────────────────────┤
│                    核心渲染器 (Core Renderer)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  流控制器   │  │  DOM 管理器  │  │   性能监控器     │  │
│  │(FlowControl)│  │(DOMManager)  │  │(PerformanceMonitor)│ │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    处理层 (Processing Layer)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 增量解析器  │  │  渲染调度器  │  │   样式处理器     │  │
│  │(Incremental │  │  (Render     │  │ (StyleProcessor) │  │
│  │  Parser)    │  │  Scheduler)  │  │                  │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    基础设施层 (Infrastructure)               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  事件总线   │  │  缓冲管理器  │  │   工具函数       │  │
│  │ (EventBus)  │  │(BufferManager)│ │   (Utils)        │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 层次说明

1. **应用层**：对外提供统一的 API 接口
2. **核心渲染器**：协调各个模块，管理整体渲染流程
3. **处理层**：负责具体的解析、调度和样式处理
4. **基础设施层**：提供通用的基础功能支持

## 3. 模块设计

### 3.1 核心渲染器 (StreamingMarkdownRenderer)

**职责**：

- 协调各个子模块的工作
- 管理渲染生命周期
- 提供对外的 API 接口

**主要接口**：

```typescript
interface StreamingMarkdownRenderer {
  // 写入新的 Markdown 内容
  write(chunk: string): void;

  // 完成渲染
  end(): void;

  // 重置渲染器状态
  reset(): void;

  // 设置目标容器
  setContainer(container: HTMLElement): void;

  // 更新样式映射
  updateStyleMap(styleMap: Map<string, string>): void;
}
```

### 3.2 增量解析器 (IncrementalParser)

**职责**：

- 维护解析状态机
- 识别潜在的格式标记
- 生成解析令牌流

**核心设计**：

```typescript
interface ParserState {
  // 当前解析位置
  position: number;

  // 活跃的格式标记栈
  activeMarkers: MarkerStack;

  // 潜在的格式标记缓冲
  potentialMarkers: MarkerBuffer;

  // 解析上下文
  context: ParseContext;
}

interface ParseToken {
  type: TokenType;
  content: string;
  start: number;
  end: number;
  attributes?: Record<string, any>;
}
```

**关键算法**：

- **前瞻解析**：预测可能的格式标记，减少回溯
- **状态缓存**：保存关键解析点，支持快速回溯
- **增量更新**：只处理新增内容，提高效率

### 3.3 渲染调度器 (RenderScheduler)

**职责**：

- 管理渲染队列
- 控制渲染速率
- 优化渲染批次

**核心设计**：

```typescript
interface RenderTask {
  id: string;
  tokens: ParseToken[];
  priority: Priority;
  timestamp: number;
}

interface SchedulerConfig {
  // 最小渲染间隔（ms）
  minInterval: number;

  // 最大批次大小
  maxBatchSize: number;

  // 渲染策略
  strategy: 'smooth' | 'responsive' | 'balanced';
}
```

**调度策略**：

- **平滑模式**：保持恒定的输出速率
- **响应模式**：优先快速响应，可能有抖动
- **平衡模式**：动态调整，平衡流畅性和响应性

### 3.4 DOM 管理器 (DOMManager)

**职责**：

- 管理 DOM 元素的创建和更新
- 实现增量 DOM 更新
- 处理虚拟 DOM 到真实 DOM 的映射

**核心设计**：

```typescript
interface DOMNode {
  id: string;
  type: string;
  element: HTMLElement;
  children: DOMNode[];
  isDirty: boolean;
}

interface DOMUpdate {
  type: 'create' | 'update' | 'delete';
  target: DOMNode;
  changes: ChangeSet;
}
```

### 3.5 样式处理器 (StyleProcessor)

**职责**：

- 管理样式映射
- 应用样式到元素
- 支持动态样式更新

**核心设计**：

```typescript
interface StyleMapping {
  // HTML 标签到 CSS 类的映射
  tagStyles: Map<string, string>;

  // 特殊样式规则
  specialRules: StyleRule[];

  // 默认样式
  defaults: DefaultStyles;
}
```

### 3.6 缓冲管理器 (BufferManager)

**职责**：

- 管理输入缓冲
- 优化内存使用
- 支持回溯操作

**核心设计**：

```typescript
interface Buffer {
  // 环形缓冲区
  data: RingBuffer<string>;

  // 缓冲区大小
  size: number;

  // 当前位置
  position: number;
}
```

### 3.7 事件总线 (EventBus)

**职责**：

- 模块间通信
- 生命周期事件
- 错误处理

**事件类型**：

```typescript
enum EventType {
  // 解析事件
  PARSE_START = 'parse:start',
  PARSE_TOKEN = 'parse:token',
  PARSE_END = 'parse:end',

  // 渲染事件
  RENDER_START = 'render:start',
  RENDER_BATCH = 'render:batch',
  RENDER_END = 'render:end',

  // 性能事件
  PERF_METRIC = 'perf:metric',

  // 错误事件
  ERROR = 'error',
}
```

### 3.8 性能监控器 (PerformanceMonitor)

**职责**：

- 收集性能指标
- 提供性能报告
- 性能预警

**监控指标**：

```typescript
interface PerformanceMetrics {
  // 解析延迟
  parseLatency: number;

  // 渲染延迟
  renderLatency: number;

  // 吞吐量
  throughput: number;

  // 内存使用
  memoryUsage: MemoryInfo;

  // 帧率
  fps: number;
}
```

## 4. 数据流设计

### 4.1 主要数据流

```
输入流 → 缓冲管理器 → 增量解析器 → 令牌流 → 渲染调度器 → DOM更新 → 输出
           ↓              ↓             ↓           ↓            ↓
        事件总线 ←────────────────────────────────────────────────
```

### 4.2 详细流程

1. **输入阶段**
   - 接收 Markdown 字符串块
   - 存入缓冲区
   - 触发解析事件

2. **解析阶段**
   - 从缓冲区读取数据
   - 增量解析生成令牌
   - 处理潜在的格式标记

3. **调度阶段**
   - 收集解析令牌
   - 根据策略安排渲染
   - 批量处理提高效率

4. **渲染阶段**
   - 将令牌转换为 DOM 操作
   - 应用样式映射
   - 更新真实 DOM

5. **监控阶段**
   - 收集各阶段性能数据
   - 生成性能报告
   - 提供优化建议

## 5. 接口设计

### 5.1 公共 API

```typescript
// 主类
class StreamingMarkdownRenderer {
  constructor(options?: RendererOptions);

  // 核心方法
  write(chunk: string): void;
  end(): void;
  reset(): void;

  // 配置方法
  setContainer(container: HTMLElement): void;
  updateStyleMap(styleMap: Map<string, string>): void;
  setRenderStrategy(strategy: RenderStrategy): void;

  // 事件方法
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;

  // 性能方法
  getPerformanceMetrics(): PerformanceMetrics;
}

// 配置选项
interface RendererOptions {
  container?: HTMLElement;
  styleMap?: Map<string, string>;
  strategy?: RenderStrategy;
  bufferSize?: number;
  enableMetrics?: boolean;
}
```

### 5.2 内部接口

各模块间通过明确定义的接口通信，确保低耦合：

```typescript
// 解析器接口
interface IParser {
  parse(input: string): ParseToken[];
  getState(): ParserState;
  setState(state: ParserState): void;
}

// 调度器接口
interface IScheduler {
  schedule(tokens: ParseToken[]): void;
  flush(): void;
  setStrategy(strategy: RenderStrategy): void;
}

// DOM管理器接口
interface IDOMManager {
  createElement(token: ParseToken): HTMLElement;
  updateElement(element: HTMLElement, token: ParseToken): void;
  removeElement(element: HTMLElement): void;
}
```

## 6. 性能优化策略

### 6.1 解析优化

- **增量解析**：只处理新增内容
- **状态缓存**：避免重复解析
- **预测优化**：基于上下文预测格式

### 6.2 渲染优化

- **批量更新**：减少 DOM 操作次数
- **虚拟 DOM**：最小化实际 DOM 变更
- **防抖节流**：控制渲染频率

### 6.3 内存优化

- **环形缓冲**：固定内存占用
- **对象池**：复用频繁创建的对象
- **及时清理**：释放不再需要的资源

## 7. 扩展性设计

### 7.1 插件系统

支持通过插件扩展功能：

```typescript
interface Plugin {
  name: string;
  version: string;
  install(renderer: StreamingMarkdownRenderer): void;
  uninstall(): void;
}
```

### 7.2 自定义解析规则

允许用户添加自定义的 Markdown 语法：

```typescript
interface CustomRule {
  name: string;
  pattern: RegExp;
  parser: (match: RegExpMatchArray) => ParseToken;
  renderer: (token: ParseToken) => HTMLElement;
}
```

### 7.3 主题系统

支持完整的主题定制：

```typescript
interface Theme {
  name: string;
  styles: Map<string, string>;
  variables: Record<string, string>;
}
```

## 8. 错误处理

### 8.1 错误类型

- **解析错误**：无效的 Markdown 语法
- **渲染错误**：DOM 操作失败
- **性能错误**：超出性能阈值

### 8.2 错误恢复

- **优雅降级**：出错时回退到纯文本
- **部分恢复**：只重试失败的部分
- **错误边界**：隔离错误影响范围

## 9. 测试策略

### 9.1 单元测试

- 每个模块独立测试
- 覆盖边界情况
- 模拟流式输入

### 9.2 集成测试

- 模块间交互测试
- 完整流程测试
- 性能基准测试

### 9.3 端到端测试

- 真实浏览器环境
- 用户交互模拟
- 视觉回归测试

## 10. 部署架构

### 10.1 构建产物

- **ESM 版本**：现代浏览器和构建工具
- **UMD 版本**：传统浏览器兼容
- **类型定义**：TypeScript 支持

### 10.2 CDN 支持

- 提供 CDN 链接
- 支持版本锁定
- 自动压缩优化

## 11. 架构决策记录 (ADR)

### ADR-001: 选择 TypeScript

**状态**：已采纳
**原因**：

- 类型安全，减少运行时错误
- 更好的 IDE 支持
- 便于大型项目维护

### ADR-002: 原生 DOM API vs 虚拟 DOM

**状态**：已采纳（原生 DOM API）
**原因**：

- 避免框架依赖
- 更直接的性能控制
- 减小打包体积

### ADR-003: 事件驱动架构

**状态**：已采纳
**原因**：

- 模块解耦
- 易于扩展
- 便于调试和监控

### ADR-004: 插件化设计

**状态**：已采纳
**原因**：

- 核心功能精简
- 用户可定制
- 社区生态友好

## 12. 未来演进

### 12.1 短期计划

- 完善核心功能
- 性能优化
- 增加更多 Markdown 语法支持

### 12.2 中期计划

- 插件市场
- 可视化调试工具
- 框架适配器（React、Vue、Angular）

### 12.3 长期愿景

- AI 驱动的渲染优化
- 协作编辑支持
- 跨平台渲染（移动端、桌面端）
