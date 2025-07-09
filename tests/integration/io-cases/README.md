# 集成测试用例说明

这个目录包含了流式 Markdown 渲染器的集成测试用例。每个测试用例都是一个独立的目录，包含以下文件：

## 目录结构

```
io-cases/
├── bold-text/              # 测试用例目录
│   ├── input.md           # 输入的 Markdown 文本
│   ├── config.json        # 渲染器配置
│   ├── expected-outputs/  # 预期的输出序列
│   │   ├── 001.html      # 第1个字符后的输出
│   │   ├── 002.html      # 第2个字符后的输出
│   │   └── ...           # 每个字符后的输出
│   └── expected-logs.json # 预期的日志序列
├── italic-text/
│   └── ...
└── ...
```

## 文件格式

### input.md

纯文本文件，包含要测试的 Markdown 内容。

### config.json

渲染器的配置，例如：

```json
{
  "enableMetrics": true,
  "debug": true,
  "bufferDelay": 200,
  "inputDelay": 50,
  "styleMap": {
    "strong": "font-bold",
    "em": "italic"
  }
}
```

### expected-outputs/

每个 HTML 文件代表一个字符输入后的预期渲染结果。文件名使用三位数字编号。

### expected-logs.json

包含预期的日志序列，格式如下：

```json
[
  {
    "charIndex": 0,
    "logs": [
      {
        "type": "write",
        "message": "写入字符: *"
      }
    ]
  },
  {
    "charIndex": 1,
    "logs": [
      {
        "type": "write",
        "message": "写入字符: *"
      },
      {
        "type": "token",
        "message": "生成令牌: POTENTIAL_BOLD"
      }
    ]
  }
]
```

## 测试流程

1. 加载测试用例的所有文件
2. 创建渲染器实例（使用 config.json）
3. 逐字符输入 input.md 的内容
4. 在每个字符输入后：
   - 捕获当前的 HTML 输出
   - 收集产生的日志
   - 与预期结果进行比较
5. 完成所有字符输入后，调用 end() 方法
6. 验证最终状态

## 创建新测试用例

1. 在 io-cases/ 下创建新目录
2. 创建 input.md 文件
3. 创建 config.json 文件（可选，使用默认配置）
4. 运行生成工具创建预期输出（开发中）
5. 手动验证并调整预期结果
