/**
 * 样式处理器 V2 - 为快照渲染系统优化的样式处理器
 *
 * 核心职责：
 * 1. 管理元素标签到 CSS 类的映射
 * 2. 支持主题系统
 * 3. 提供样式继承和组合功能
 * 4. 与快照渲染器深度集成
 */

/**
 * 样式映射类型
 */
export type StyleMap = Map<string, string[]>;

/**
 * 主题定义
 */
export interface Theme {
  name: string;
  styles: StyleMap;
  extends?: string; // 继承的主题名称
}

/**
 * 样式处理器 V2 配置
 */
export interface StyleProcessorV2Options {
  defaultTheme?: string;
  themes?: Map<string, Theme>;
  baseStyles?: StyleMap;
}

/**
 * 样式处理器 V2
 */
export class StyleProcessorV2 {
  private themes: Map<string, Theme>;
  private currentTheme: string;
  private baseStyles: StyleMap;
  private cache: Map<string, string[]> = new Map();

  constructor(options: StyleProcessorV2Options = {}) {
    this.themes = options.themes || new Map();
    this.currentTheme = options.defaultTheme || 'default';
    this.baseStyles = options.baseStyles || this.createDefaultBaseStyles();

    // 如果没有提供默认主题，创建一个
    if (!this.themes.has('default')) {
      this.themes.set('default', {
        name: 'default',
        styles: this.createDefaultStyles(),
      });
    }
  }

  /**
   * 创建默认基础样式
   */
  private createDefaultBaseStyles(): StyleMap {
    return new Map([
      // 基础排版
      ['h1', ['text-4xl', 'font-bold', 'mb-4']],
      ['h2', ['text-3xl', 'font-bold', 'mb-3']],
      ['h3', ['text-2xl', 'font-bold', 'mb-2']],
      ['h4', ['text-xl', 'font-bold', 'mb-2']],
      ['h5', ['text-lg', 'font-bold', 'mb-1']],
      ['h6', ['text-base', 'font-bold', 'mb-1']],
      ['p', ['mb-4']],
      ['a', ['text-blue-600', 'hover:text-blue-800', 'underline']],
      ['blockquote', ['pl-4', 'border-l-4', 'border-gray-300', 'italic']],
      ['hr', ['my-8', 'border-t', 'border-gray-300']],
    ]);
  }

  /**
   * 创建默认主题样式
   */
  private createDefaultStyles(): StyleMap {
    return new Map([
      // 文本格式
      ['strong', ['font-bold']],
      ['em', ['italic']],
      ['del', ['line-through']],
      ['code', ['bg-gray-100', 'px-1', 'py-0.5', 'rounded', 'font-mono', 'text-sm']],
      ['pre', ['bg-gray-100', 'p-4', 'rounded', 'overflow-x-auto']],

      // 列表
      ['ul', ['list-disc', 'pl-6', 'mb-4']],
      ['ol', ['list-decimal', 'pl-6', 'mb-4']],
      ['li', ['mb-1']],

      // 表格
      ['table', ['w-full', 'border-collapse', 'mb-4']],
      ['thead', ['bg-gray-50']],
      ['th', ['border', 'border-gray-300', 'px-4', 'py-2', 'text-left']],
      ['td', ['border', 'border-gray-300', 'px-4', 'py-2']],
    ]);
  }

  /**
   * 获取指定标签的样式
   */
  getStylesForTag(tag: string): string[] {
    // 检查缓存
    const cacheKey = `${this.currentTheme}:${tag}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 收集样式
    const styles: string[] = [];

    // 1. 添加基础样式
    if (this.baseStyles.has(tag)) {
      styles.push(...this.baseStyles.get(tag)!);
    }

    // 2. 添加主题样式（包括继承的主题）
    const themeStyles = this.getThemeStyles(this.currentTheme);
    if (themeStyles.has(tag)) {
      styles.push(...themeStyles.get(tag)!);
    }

    // 去重
    const uniqueStyles = Array.from(new Set(styles));

    // 缓存结果
    this.cache.set(cacheKey, uniqueStyles);

    return uniqueStyles;
  }

  /**
   * 获取主题样式（包括继承）
   */
  private getThemeStyles(themeName: string): StyleMap {
    const theme = this.themes.get(themeName);
    if (!theme) {
      return new Map();
    }

    // 如果有继承的主题，先获取父主题样式
    if (theme.extends) {
      const parentStyles = this.getThemeStyles(theme.extends);
      const mergedStyles = new Map(parentStyles);

      // 合并当前主题样式
      theme.styles.forEach((styles, tag) => {
        mergedStyles.set(tag, styles);
      });

      return mergedStyles;
    }

    return theme.styles;
  }

  /**
   * 设置当前主题
   */
  setTheme(themeName: string): void {
    if (!this.themes.has(themeName)) {
      throw new Error(`Theme '${themeName}' not found`);
    }
    this.currentTheme = themeName;
    // 清空缓存
    this.cache.clear();
  }

  /**
   * 添加或更新主题
   */
  addTheme(theme: Theme): void {
    this.themes.set(theme.name, theme);
    // 如果更新的是当前主题，清空缓存
    if (theme.name === this.currentTheme) {
      this.cache.clear();
    }
  }

  /**
   * 设置特定标签的样式
   */
  setTagStyles(tag: string, styles: string[]): void {
    const currentTheme = this.themes.get(this.currentTheme);
    if (!currentTheme) {
      throw new Error(`Current theme '${this.currentTheme}' not found`);
    }

    currentTheme.styles.set(tag, styles);

    // 清空相关缓存
    const cacheKey = `${this.currentTheme}:${tag}`;
    this.cache.delete(cacheKey);
  }

  /**
   * 合并样式
   */
  mergeStyles(tag: string, additionalStyles: string[]): void {
    const currentStyles = this.getStylesForTag(tag);
    const mergedStyles = Array.from(new Set([...currentStyles, ...additionalStyles]));
    this.setTagStyles(tag, mergedStyles);
  }

  /**
   * 获取当前主题名称
   */
  getCurrentTheme(): string {
    return this.currentTheme;
  }

  /**
   * 获取所有可用主题
   */
  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * 导出主题
   */
  exportTheme(themeName: string): Theme | undefined {
    return this.themes.get(themeName);
  }

  /**
   * 导入主题
   */
  importTheme(theme: Theme): void {
    this.addTheme(theme);
  }

  /**
   * 重置为默认样式
   */
  reset(): void {
    this.themes.clear();
    this.themes.set('default', {
      name: 'default',
      styles: this.createDefaultStyles(),
    });
    this.currentTheme = 'default';
    this.cache.clear();
  }

  /**
   * 创建暗色主题
   */
  static createDarkTheme(): Theme {
    return {
      name: 'dark',
      styles: new Map([
        ['strong', ['font-bold', 'text-gray-100']],
        ['em', ['italic', 'text-gray-200']],
        [
          'code',
          ['bg-gray-800', 'text-gray-100', 'px-1', 'py-0.5', 'rounded', 'font-mono', 'text-sm'],
        ],
        ['pre', ['bg-gray-900', 'text-gray-100', 'p-4', 'rounded', 'overflow-x-auto']],
        ['a', ['text-blue-400', 'hover:text-blue-300', 'underline']],
        ['blockquote', ['pl-4', 'border-l-4', 'border-gray-600', 'italic', 'text-gray-300']],
        ['hr', ['my-8', 'border-t', 'border-gray-600']],
      ]),
    };
  }

  /**
   * 创建高对比度主题
   */
  static createHighContrastTheme(): Theme {
    return {
      name: 'high-contrast',
      styles: new Map([
        ['strong', ['font-black', 'text-black']],
        ['em', ['italic', 'font-bold']],
        [
          'code',
          [
            'bg-yellow-200',
            'text-black',
            'px-2',
            'py-1',
            'rounded',
            'font-mono',
            'text-base',
            'font-bold',
          ],
        ],
        [
          'pre',
          [
            'bg-yellow-100',
            'text-black',
            'p-4',
            'rounded',
            'overflow-x-auto',
            'border-2',
            'border-black',
          ],
        ],
        [
          'a',
          ['text-blue-900', 'hover:text-black', 'underline', 'underline-offset-4', 'decoration-2'],
        ],
        ['blockquote', ['pl-4', 'border-l-8', 'border-black', 'font-bold']],
      ]),
    };
  }
}
