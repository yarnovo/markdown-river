import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'test-repo/**',
      '.test-repos/**',
      'demo/static/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      'no-console': 'off',
      // Prettier 将处理这些格式规则
      'prettier/prettier': 'error',
      // 禁用与 Prettier 冲突的规则
      ...prettierConfig.rules,
    },
  },
  {
    files: ['demo/**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'prettier/prettier': 'error',
      ...prettierConfig.rules,
    },
  }
);
