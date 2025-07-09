/**
 * 样式处理器 - 管理 Markdown 元素到 CSS 类的映射
 *
 * 核心功能：
 * 1. 维护标签到 CSS 类的映射关系
 * 2. 支持批量设置和更新
 * 3. 提供默认样式映射
 * 4. 支持主题切换
 */

/**
 * 样式映射配置
 */
export type StyleMap = Map<string, string>;

/**
 * 主题配置
 */
export interface Theme {
  /**
   * 主题名称
   */
  name: string;

  /**
   * 样式映射
   */
  styles: StyleMap;

  /**
   * 主题描述（可选）
   */
  description?: string;
}

/**
 * 样式处理器配置
 */
export interface StyleProcessorOptions {
  /**
   * 初始样式映射
   */
  styleMap?: StyleMap;

  /**
   * 是否使用默认样式作为基础
   * @default true
   */
  useDefaults?: boolean;

  /**
   * 自定义主题列表
   */
  themes?: Theme[];
}

/**
 * 默认样式映射
 */
export const DEFAULT_STYLE_MAP: StyleMap = new Map([
  // 标题
  ['h1', 'text-4xl font-bold mb-4'],
  ['h2', 'text-3xl font-bold mb-3'],
  ['h3', 'text-2xl font-bold mb-2'],
  ['h4', 'text-xl font-bold mb-2'],
  ['h5', 'text-lg font-bold mb-1'],
  ['h6', 'text-base font-bold mb-1'],

  // 段落和文本
  ['p', 'mb-4'],
  ['strong', 'font-bold'],
  ['em', 'italic'],
  ['del', 'line-through'],
  ['code', 'bg-gray-100 px-1 py-0.5 rounded font-mono text-sm'],

  // 列表
  ['ul', 'list-disc pl-6 mb-4'],
  ['ol', 'list-decimal pl-6 mb-4'],
  ['li', 'mb-1'],

  // 引用和代码块
  ['blockquote', 'border-l-4 border-gray-300 pl-4 italic mb-4'],
  ['pre', 'bg-gray-100 p-4 rounded overflow-x-auto mb-4'],

  // 链接和图片
  ['a', 'text-blue-600 hover:text-blue-800 underline'],
  ['img', 'max-w-full h-auto'],

  // 表格
  ['table', 'border-collapse w-full mb-4'],
  ['thead', 'bg-gray-100'],
  ['th', 'border px-4 py-2 text-left font-bold'],
  ['td', 'border px-4 py-2'],
  ['tr', 'border-b'],

  // 其他
  ['hr', 'border-t border-gray-300 my-4'],
]);

export class StyleProcessor {
  private styleMap: StyleMap;
  private themes: Map<string, Theme> = new Map();
  private currentTheme?: string;
  private useDefaults: boolean;

  constructor(options: StyleProcessorOptions = {}) {
    this.useDefaults = options.useDefaults ?? true;

    // 初始化样式映射
    this.styleMap = new Map();
    if (this.useDefaults) {
      // 复制默认样式
      DEFAULT_STYLE_MAP.forEach((value, key) => {
        this.styleMap.set(key, value);
      });
    }

    // 应用用户自定义样式（会覆盖默认样式）
    if (options.styleMap) {
      options.styleMap.forEach((value, key) => {
        this.styleMap.set(key, value);
      });
    }

    // 注册主题
    if (options.themes) {
      options.themes.forEach(theme => {
        this.registerTheme(theme);
      });
    }
  }

  /**
   * 获取指定标签的样式类
   */
  getStyle(tag: string): string | undefined {
    return this.styleMap.get(tag);
  }

  /**
   * 设置指定标签的样式类
   */
  setStyle(tag: string, className: string): void {
    this.styleMap.set(tag, className);
  }

  /**
   * 批量设置样式
   */
  setStyles(styles: StyleMap | Record<string, string>): void {
    if (styles instanceof Map) {
      styles.forEach((value, key) => {
        this.styleMap.set(key, value);
      });
    } else {
      Object.entries(styles).forEach(([key, value]) => {
        this.styleMap.set(key, value);
      });
    }
  }

  /**
   * 移除指定标签的样式
   */
  removeStyle(tag: string): boolean {
    return this.styleMap.delete(tag);
  }

  /**
   * 清空所有样式
   */
  clearStyles(): void {
    this.styleMap.clear();

    // 如果使用默认样式，重新加载
    if (this.useDefaults) {
      DEFAULT_STYLE_MAP.forEach((value, key) => {
        this.styleMap.set(key, value);
      });
    }
  }

  /**
   * 获取所有样式映射
   */
  getAllStyles(): StyleMap {
    return new Map(this.styleMap);
  }

  /**
   * 检查是否有指定标签的样式
   */
  hasStyle(tag: string): boolean {
    return this.styleMap.has(tag);
  }

  /**
   * 获取样式数量
   */
  getStyleCount(): number {
    return this.styleMap.size;
  }

  /**
   * 注册主题
   */
  registerTheme(theme: Theme): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * 切换主题
   */
  switchTheme(themeName: string): boolean {
    const theme = this.themes.get(themeName);
    if (!theme) {
      return false;
    }

    // 清空当前样式
    this.styleMap.clear();

    // 如果使用默认样式，先加载默认样式
    if (this.useDefaults) {
      DEFAULT_STYLE_MAP.forEach((value, key) => {
        this.styleMap.set(key, value);
      });
    }

    // 应用主题样式（覆盖默认样式）
    theme.styles.forEach((value, key) => {
      this.styleMap.set(key, value);
    });

    this.currentTheme = themeName;
    return true;
  }

  /**
   * 获取当前主题名称
   */
  getCurrentTheme(): string | undefined {
    return this.currentTheme;
  }

  /**
   * 获取所有已注册的主题
   */
  getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * 获取指定主题
   */
  getTheme(themeName: string): Theme | undefined {
    return this.themes.get(themeName);
  }

  /**
   * 移除主题
   */
  removeTheme(themeName: string): boolean {
    if (this.currentTheme === themeName) {
      this.currentTheme = undefined;
    }
    return this.themes.delete(themeName);
  }

  /**
   * 导出当前样式为主题
   */
  exportAsTheme(name: string, description?: string): Theme {
    return {
      name,
      styles: new Map(this.styleMap),
      description,
    };
  }

  /**
   * 从 CSS 类字符串数组创建样式映射
   * 用于快速配置
   */
  static fromClassList(classList: Record<string, string[]>): StyleMap {
    const styleMap = new Map<string, string>();
    Object.entries(classList).forEach(([tag, classes]) => {
      styleMap.set(tag, classes.join(' '));
    });
    return styleMap;
  }

  /**
   * 合并多个样式映射
   * 后面的映射会覆盖前面的
   */
  static mergeStyleMaps(...maps: StyleMap[]): StyleMap {
    const merged = new Map<string, string>();
    maps.forEach(map => {
      map.forEach((value, key) => {
        merged.set(key, value);
      });
    });
    return merged;
  }
}
