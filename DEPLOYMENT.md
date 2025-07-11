# 部署指南

本文档详细说明了 Markdown River 的部署流程和发布机制。

## 目录

- [自动化 CI/CD 流程](#自动化-cicd-流程)
  - [触发条件](#触发条件)
  - [CI 流程（持续集成）](#ci-流程持续集成)
  - [CD 流程（持续部署）](#cd-流程持续部署)
- [手动发布流程](#手动发布流程)
  - [1. 版本准备](#1-版本准备)
  - [2. 更新版本号](#2-更新版本号)
  - [3. 提交更改](#3-提交更改)
  - [4. 创建版本标签](#4-创建版本标签)
  - [5. 监控发布状态](#5-监控发布状态)
- [发布前检查清单](#发布前检查清单)
- [秘密配置](#秘密配置)
  - [NPM_TOKEN](#npm_token)
- [故障排查](#故障排查)
  - [版本不匹配错误](#版本不匹配错误)
  - [npm 发布失败](#npm-发布失败)
  - [构建失败](#构建失败)
- [回滚版本](#回滚版本)
- [开发环境设置](#开发环境设置)
- [GitHub Pages 部署](#github-pages-部署)
  - [自动部署流程](#自动部署流程)
  - [部署步骤](#部署步骤)
  - [手动触发部署](#手动触发部署)
  - [配置 GitHub Pages](#配置-github-pages)
  - [配置 Environment（可选）](#配置-environment可选)
  - [访问在线 Demo](#访问在线-demo)
  - [本地预览 Demo](#本地预览-demo)
  - [Demo 技术栈](#demo-技术栈)
  - [故障排查](#故障排查-1)
- [相关链接](#相关链接)

## 自动化 CI/CD 流程

项目使用 GitHub Actions 实现自动化的持续集成和持续部署（CI/CD）。

### 触发条件

CI/CD 工作流会在以下情况下自动触发：

1. **推送到主分支**：当代码推送到 `main` 分支时
2. **创建版本标签**：当创建以 `v` 开头的标签时（如 `v1.0.0`）
3. **Pull Request**：当创建或更新针对 `main` 分支的 PR 时

### CI 流程（持续集成）

每次触发都会执行以下步骤：

1. **环境准备**
   - 检出代码
   - 设置 Node.js 20 环境
   - 安装依赖（`npm ci`）

2. **代码质量检查**
   - ESLint 检查：`npm run lint`
   - TypeScript 类型检查：`npm run typecheck`
   - 单元测试：`npm test`

3. **构建验证**
   - 构建项目：`npm run build`
   - 验证构建产物是否存在
   - 测试版本验证功能
   - 验证 package.json 中的版本格式

### CD 流程（持续部署）

当推送版本标签时，除了执行 CI 流程外，还会执行以下发布步骤：

1. **版本一致性检查**
   - 验证 Git 标签版本与 package.json 中的版本是否一致
   - 例如：标签 `v1.0.0` 必须对应 package.json 中的 `"version": "1.0.0"`

2. **发布到 npm**
   - 自动发布包到 npm registry
   - 使用 `NPM_TOKEN` 进行身份验证

3. **创建 GitHub Release**
   - 自动创建 GitHub Release
   - 包含安装说明和相关链接
   - 如果版本号包含 `-`（如 `v1.0.0-beta.1`），则标记为预发布版本

## 手动发布流程

如果需要手动发布新版本，请按照以下步骤操作：

### 1. 版本准备

```bash
# 确保本地代码是最新的
git checkout main
git pull origin main

# 运行完整的质量检查
npm run check
```

### 2. 更新版本号

手动编辑 `package.json` 文件，更新 `version` 字段：

```json
{
  "version": "1.0.0" // 更新为新版本号
}
```

版本号应遵循语义化版本规范（Semantic Versioning）：

- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 3. 提交更改

```bash
# 提交版本更新
git add package.json
git commit -m "chore: bump version to 1.0.0"
git push origin main
```

### 4. 创建版本标签

```bash
# 创建标签（注意 v 前缀）
git tag v1.0.0

# 推送标签，这将触发自动发布流程
git push origin v1.0.0
```

### 5. 监控发布状态

1. 访问 [GitHub Actions](https://github.com/yarnovo/markdown-river/actions) 页面
2. 查看 CI/CD 工作流的执行状态
3. 确认所有步骤都成功完成

## 发布前检查清单

在发布新版本前，请确保：

- [ ] 所有测试通过：`npm test`
- [ ] 代码风格符合规范：`npm run lint`
- [ ] TypeScript 类型检查通过：`npm run typecheck`
- [ ] 构建成功：`npm run build`
- [ ] 更新了 CHANGELOG（如果有）
- [ ] package.json 中的版本号已更新
- [ ] 重要的 API 变更已在文档中说明

## 秘密配置

项目需要在 GitHub 仓库中配置以下秘密：

### NPM_TOKEN

用于自动发布到 npm registry。

获取方式：

1. 登录 [npm](https://www.npmjs.com/)
2. 进入 Account Settings > Access Tokens
3. 创建新的 Publish token
4. 在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加 `NPM_TOKEN`

## 故障排查

### 版本不匹配错误

如果看到 "Tag version does not match package.json version" 错误：

- 确保 Git 标签版本（去掉 v 前缀）与 package.json 中的版本完全一致
- 例如：标签 `v1.0.0` 对应 `"version": "1.0.0"`

### npm 发布失败

如果 npm 发布失败：

- 检查 NPM_TOKEN 是否正确配置
- 确认 npm 账号有发布权限
- 检查包名是否已被占用

### 构建失败

如果构建步骤失败：

- 本地运行 `npm run build` 检查是否有错误
- 确保所有依赖都已正确安装
- 检查 TypeScript 配置是否正确

## 回滚版本

如果需要回滚到之前的版本：

1. **npm 端**：无法删除已发布的版本，但可以：
   - 发布新的修复版本
   - 使用 `npm deprecate` 标记有问题的版本

2. **GitHub Release**：
   - 可以删除或编辑 Release
   - 但不影响已发布到 npm 的包

## 开发环境设置

为了确保本地开发环境与 CI 环境一致：

```bash
# 使用 Node.js 20
nvm use 20

# 安装依赖
npm ci

# 运行完整检查
npm run check
```

## GitHub Pages 部署

项目使用 GitHub Pages 托管在线演示，展示 Markdown River 的实时流式渲染能力。

### 自动部署流程

Demo 会在以下情况自动部署到 GitHub Pages：

1. **创建版本标签**：当推送以 `v` 开头的标签时（如 `v1.0.0`）
2. **手动触发**：通过 GitHub Actions 界面手动运行工作流

### 部署步骤

部署工作流（`.github/workflows/deploy-demo.yml`）执行以下步骤：

1. **构建阶段**
   - 检出代码并设置 Node.js 20 环境
   - 安装项目依赖并构建主库
   - 进入 demo 目录安装依赖
   - 使用 Vite 构建 demo 应用
   - 上传构建产物（`demo/dist`）

2. **部署阶段**
   - 将构建产物部署到 GitHub Pages
   - 生成部署摘要，包含访问链接和版本信息

### 手动触发部署

如需手动部署 Demo 到 GitHub Pages：

1. 访问 [GitHub Actions](https://github.com/yarnovo/markdown-river/actions)
2. 选择 "Deploy Demo to GitHub Pages" 工作流
3. 点击 "Run workflow" 按钮
4. 选择分支并运行

### 配置 GitHub Pages

首次使用需要在仓库设置中启用 GitHub Pages：

1. 进入仓库 Settings > Pages
2. Source 选择 "GitHub Actions"
3. 保存设置

### 配置 Environment（可选）

如果需要更好的部署管理和保护，可以创建 environment：

1. 进入仓库 Settings > Environments
2. 点击 "New environment"
3. 输入名称 `github-pages`
4. 根据需要配置保护规则

创建后，可以在工作流文件中添加 environment 配置：

```yaml
deploy:
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
```

### 访问在线 Demo

部署成功后，可以通过以下地址访问：

- 主站点：`https://[用户名].github.io/markdown-river/`
- 部署状态和具体链接会在 GitHub Actions 的运行摘要中显示

### 本地预览 Demo

在部署前，可以本地预览 Demo：

```bash
# 构建主库
npm run build

# 进入 demo 目录
cd demo

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 或构建并预览
npm run build
npm run preview
```

### Demo 技术栈

- **构建工具**：Vite 5
- **框架**：React 18
- **样式**：Tailwind CSS 4
- **UI 组件**：Headless UI

### 故障排查

#### GitHub Pages 404 错误

- 确认 GitHub Pages 已在仓库设置中启用
- 检查部署工作流是否成功完成
- 等待几分钟让 GitHub Pages 缓存更新

#### 构建失败

- 确保主库能正常构建：`npm run build`
- 检查 demo 依赖是否正确安装
- 查看 GitHub Actions 日志获取详细错误信息

#### 样式或功能异常

- 检查 Vite 配置中的 `base` 路径设置
- 确认所有资源路径使用相对路径
- 验证生产环境构建配置

## 相关链接

- [npm 包页面](https://www.npmjs.com/package/markdown-river)
- [GitHub Actions](https://github.com/yarnovo/markdown-river/actions)
- [GitHub Releases](https://github.com/yarnovo/markdown-river/releases)
- [在线 Demo](https://yarnovo.github.io/markdown-river/)（部署后可用）
