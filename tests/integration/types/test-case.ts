/**
 * 集成测试用例的类型定义
 */

/**
 * 渲染器配置
 */
export interface TestCaseConfig {
  enableMetrics?: boolean;
  debug?: boolean;
  bufferDelay?: number;
  styleMap?: Record<string, string>;
  /** 输入速率配置 */
  inputDelay?: number; // 每个字符输入之间的延迟（毫秒）
}

/**
 * 日志条目
 */
export interface LogEntry {
  type: 'write' | 'token' | 'state' | 'error' | 'debug';
  message: string;
  data?: unknown;
}

/**
 * 字符位置的日志
 */
export interface CharacterLog {
  charIndex: number;
  logs: LogEntry[];
}

/**
 * 测试用例数据
 */
export interface TestCaseData {
  /** 测试用例名称 */
  name: string;
  /** 测试用例路径 */
  path: string;
  /** 输入的 Markdown 文本 */
  input: string;
  /** 渲染器配置 */
  config?: TestCaseConfig;
  /** 预期的输出序列（每个字符后的 HTML） */
  expectedOutputs: string[];
  /** 预期的日志序列 */
  expectedLogs?: CharacterLog[];
}

/**
 * 测试结果
 */
export interface TestResult {
  /** 是否通过 */
  passed: boolean;
  /** 失败的字符位置 */
  failedAtChar?: number;
  /** 错误信息 */
  error?: string;
  /** 实际输出 */
  actualOutput?: string;
  /** 预期输出 */
  expectedOutput?: string;
  /** 实际日志 */
  actualLogs?: LogEntry[];
  /** 预期日志 */
  expectedLogs?: LogEntry[];
}
