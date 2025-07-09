import { describe, it, expect, beforeEach } from 'vitest';
import { StyleProcessor, DEFAULT_STYLE_MAP, Theme } from '../../src/infrastructure/style-processor';

describe('StyleProcessor', () => {
  let processor: StyleProcessor;

  beforeEach(() => {
    processor = new StyleProcessor();
  });

  describe('基础功能', () => {
    it('应该使用默认样式初始化', () => {
      expect(processor.getStyleCount()).toBe(DEFAULT_STYLE_MAP.size);
      expect(processor.getStyle('h1')).toBe(DEFAULT_STYLE_MAP.get('h1'));
      expect(processor.getStyle('strong')).toBe(DEFAULT_STYLE_MAP.get('strong'));
    });

    it('应该支持禁用默认样式', () => {
      const customProcessor = new StyleProcessor({ useDefaults: false });
      expect(customProcessor.getStyleCount()).toBe(0);
      expect(customProcessor.getStyle('h1')).toBeUndefined();
    });

    it('应该支持自定义样式覆盖默认样式', () => {
      const customStyles = new Map([
        ['h1', 'custom-h1-class'],
        ['h2', 'custom-h2-class'],
      ]);

      const customProcessor = new StyleProcessor({ styleMap: customStyles });

      expect(customProcessor.getStyle('h1')).toBe('custom-h1-class');
      expect(customProcessor.getStyle('h2')).toBe('custom-h2-class');
      // 其他默认样式应该保留
      expect(customProcessor.getStyle('p')).toBe(DEFAULT_STYLE_MAP.get('p'));
    });
  });

  describe('样式操作', () => {
    it('应该设置和获取样式', () => {
      processor.setStyle('custom-tag', 'custom-class');
      expect(processor.getStyle('custom-tag')).toBe('custom-class');
      expect(processor.hasStyle('custom-tag')).toBe(true);
    });

    it('应该批量设置样式（Map）', () => {
      const styles = new Map([
        ['div', 'div-class'],
        ['span', 'span-class'],
      ]);

      processor.setStyles(styles);

      expect(processor.getStyle('div')).toBe('div-class');
      expect(processor.getStyle('span')).toBe('span-class');
    });

    it('应该批量设置样式（Object）', () => {
      const styles = {
        article: 'article-class',
        section: 'section-class',
      };

      processor.setStyles(styles);

      expect(processor.getStyle('article')).toBe('article-class');
      expect(processor.getStyle('section')).toBe('section-class');
    });

    it('应该移除样式', () => {
      processor.setStyle('temp', 'temp-class');
      expect(processor.hasStyle('temp')).toBe(true);

      const removed = processor.removeStyle('temp');
      expect(removed).toBe(true);
      expect(processor.hasStyle('temp')).toBe(false);

      // 移除不存在的样式
      expect(processor.removeStyle('non-existent')).toBe(false);
    });

    it('应该清空样式并恢复默认', () => {
      processor.setStyle('custom', 'custom-class');
      processor.clearStyles();

      expect(processor.hasStyle('custom')).toBe(false);
      // 默认样式应该恢复
      expect(processor.getStyle('h1')).toBe(DEFAULT_STYLE_MAP.get('h1'));
    });

    it('应该返回所有样式的副本', () => {
      const allStyles = processor.getAllStyles();

      expect(allStyles).toBeInstanceOf(Map);
      expect(allStyles.size).toBe(processor.getStyleCount());

      // 修改副本不应该影响原始数据
      allStyles.set('test', 'test-class');
      expect(processor.hasStyle('test')).toBe(false);
    });
  });

  describe('主题管理', () => {
    const darkTheme: Theme = {
      name: 'dark',
      description: 'Dark theme',
      styles: new Map([
        ['h1', 'text-white text-4xl'],
        ['p', 'text-gray-300'],
        ['code', 'bg-gray-800 text-green-400'],
      ]),
    };

    const lightTheme: Theme = {
      name: 'light',
      styles: new Map([
        ['h1', 'text-black text-4xl'],
        ['p', 'text-gray-700'],
      ]),
    };

    it('应该注册和获取主题', () => {
      processor.registerTheme(darkTheme);

      const theme = processor.getTheme('dark');
      expect(theme).toEqual(darkTheme);

      const themes = processor.getThemes();
      expect(themes).toHaveLength(1);
      expect(themes[0]).toEqual(darkTheme);
    });

    it('应该切换主题', () => {
      processor.registerTheme(darkTheme);

      const switched = processor.switchTheme('dark');
      expect(switched).toBe(true);
      expect(processor.getCurrentTheme()).toBe('dark');

      // 主题样式应该被应用
      expect(processor.getStyle('h1')).toBe('text-white text-4xl');
      expect(processor.getStyle('code')).toBe('bg-gray-800 text-green-400');

      // 未被主题覆盖的默认样式应该保留
      expect(processor.getStyle('strong')).toBe(DEFAULT_STYLE_MAP.get('strong'));
    });

    it('应该处理切换不存在的主题', () => {
      const switched = processor.switchTheme('non-existent');
      expect(switched).toBe(false);
      expect(processor.getCurrentTheme()).toBeUndefined();
    });

    it('应该支持多主题切换', () => {
      processor.registerTheme(darkTheme);
      processor.registerTheme(lightTheme);

      // 切换到 dark
      processor.switchTheme('dark');
      expect(processor.getStyle('h1')).toBe('text-white text-4xl');

      // 切换到 light
      processor.switchTheme('light');
      expect(processor.getStyle('h1')).toBe('text-black text-4xl');
      expect(processor.getCurrentTheme()).toBe('light');
    });

    it('应该移除主题', () => {
      processor.registerTheme(darkTheme);
      processor.switchTheme('dark');

      const removed = processor.removeTheme('dark');
      expect(removed).toBe(true);
      expect(processor.getTheme('dark')).toBeUndefined();
      expect(processor.getCurrentTheme()).toBeUndefined();
    });

    it('应该导出当前样式为主题', () => {
      processor.setStyle('custom', 'custom-class');

      const exported = processor.exportAsTheme('my-theme', 'My custom theme');

      expect(exported.name).toBe('my-theme');
      expect(exported.description).toBe('My custom theme');
      expect(exported.styles.get('custom')).toBe('custom-class');
      expect(exported.styles.size).toBe(processor.getStyleCount());
    });
  });

  describe('静态辅助方法', () => {
    it('应该从类列表创建样式映射', () => {
      const classList = {
        h1: ['text-4xl', 'font-bold', 'mb-4'],
        p: ['text-base', 'mb-2'],
      };

      const styleMap = StyleProcessor.fromClassList(classList);

      expect(styleMap.get('h1')).toBe('text-4xl font-bold mb-4');
      expect(styleMap.get('p')).toBe('text-base mb-2');
    });

    it('应该合并多个样式映射', () => {
      const map1 = new Map([
        ['h1', 'h1-style-1'],
        ['p', 'p-style-1'],
      ]);

      const map2 = new Map([
        ['h1', 'h1-style-2'], // 覆盖
        ['h2', 'h2-style-2'],
      ]);

      const map3 = new Map([
        ['h2', 'h2-style-3'], // 覆盖
        ['h3', 'h3-style-3'],
      ]);

      const merged = StyleProcessor.mergeStyleMaps(map1, map2, map3);

      expect(merged.get('h1')).toBe('h1-style-2'); // 被 map2 覆盖
      expect(merged.get('p')).toBe('p-style-1'); // 来自 map1
      expect(merged.get('h2')).toBe('h2-style-3'); // 被 map3 覆盖
      expect(merged.get('h3')).toBe('h3-style-3'); // 来自 map3
    });
  });

  describe('边界情况', () => {
    it('应该处理空主题', () => {
      const emptyTheme: Theme = {
        name: 'empty',
        styles: new Map(),
      };

      processor.registerTheme(emptyTheme);
      const initialCount = processor.getStyleCount();

      processor.switchTheme('empty');

      // 应该保留默认样式
      expect(processor.getStyleCount()).toBe(initialCount);
    });

    it('应该处理重复注册主题', () => {
      const theme1: Theme = {
        name: 'test',
        styles: new Map([['h1', 'style-1']]),
      };

      const theme2: Theme = {
        name: 'test',
        styles: new Map([['h1', 'style-2']]),
      };

      processor.registerTheme(theme1);
      processor.registerTheme(theme2); // 覆盖

      processor.switchTheme('test');
      expect(processor.getStyle('h1')).toBe('style-2');
    });

    it('应该在禁用默认样式时正确清空', () => {
      const customProcessor = new StyleProcessor({ useDefaults: false });
      customProcessor.setStyle('custom', 'custom-class');

      customProcessor.clearStyles();

      expect(customProcessor.getStyleCount()).toBe(0);
      expect(customProcessor.hasStyle('custom')).toBe(false);
    });
  });

  describe('复杂场景', () => {
    it('应该支持初始化时提供主题', () => {
      const themes: Theme[] = [
        {
          name: 'theme1',
          styles: new Map([['h1', 'theme1-h1']]),
        },
        {
          name: 'theme2',
          styles: new Map([['h1', 'theme2-h1']]),
        },
      ];

      const customProcessor = new StyleProcessor({ themes });

      expect(customProcessor.getThemes()).toHaveLength(2);
      expect(customProcessor.getTheme('theme1')).toBeDefined();
      expect(customProcessor.getTheme('theme2')).toBeDefined();
    });

    it('应该支持组合初始化选项', () => {
      const customStyles = new Map([['custom', 'custom-class']]);
      const theme: Theme = {
        name: 'initial',
        styles: new Map([['h1', 'initial-h1']]),
      };

      const customProcessor = new StyleProcessor({
        useDefaults: true,
        styleMap: customStyles,
        themes: [theme],
      });

      // 应该有默认样式 + 自定义样式
      expect(customProcessor.hasStyle('p')).toBe(true); // 默认
      expect(customProcessor.hasStyle('custom')).toBe(true); // 自定义

      // 切换主题
      customProcessor.switchTheme('initial');
      expect(customProcessor.getStyle('h1')).toBe('initial-h1');
      expect(customProcessor.hasStyle('custom')).toBe(false); // 主题切换后自定义样式丢失
    });
  });
});
