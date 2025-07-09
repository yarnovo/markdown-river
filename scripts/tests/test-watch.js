#!/usr/bin/env node
import { watch } from 'chokidar';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..'); // 因为现在在 scripts/tests 目录下
const distDir = join(rootDir, 'dist');
const srcDir = join(rootDir, 'src');

console.log('🔍 开始测试文件监听机制...');
console.log('📁 监听目录:');
console.log('  - src:', srcDir);
console.log('  - dist:', distDir);

let buildProcess = null;
let isBuilding = false;

// 监听 src 目录变化
const srcWatcher = watch(srcDir, {
  ignored: /(^|[/\\])\../, // 忽略隐藏文件
  persistent: true,
  ignoreInitial: true,
});

// 监听 dist 目录变化
const distWatcher = watch(distDir, {
  ignored: /(^|[/\\])\../, // 忽藏文件
  persistent: true,
  ignoreInitial: true,
});

// 构建函数
function runBuild() {
  if (isBuilding) {
    console.log('⏳ 构建中，跳过此次触发...');
    return;
  }

  isBuilding = true;
  console.log('🔨 开始构建...');

  buildProcess = spawn('npm', ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  buildProcess.on('close', code => {
    isBuilding = false;
    if (code === 0) {
      console.log('✅ 构建完成');
    } else {
      console.log('❌ 构建失败');
    }
  });
}

// 复制 dist 到 demo
function copyDistToDemo() {
  console.log('📋 复制 dist 到 demo/static...');

  const copyProcess = spawn('npm', ['run', 'copy-dist'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  copyProcess.on('close', code => {
    if (code === 0) {
      console.log('✅ 复制完成');
    } else {
      console.log('❌ 复制失败');
    }
  });
}

// 监听 src 变化
srcWatcher.on('ready', () => {
  console.log('👀 开始监听 src 目录变化...');
});

srcWatcher.on('change', path => {
  console.log(`📝 src 文件变化: ${path}`);
  runBuild();
});

srcWatcher.on('add', path => {
  console.log(`➕ src 新增文件: ${path}`);
  runBuild();
});

srcWatcher.on('unlink', path => {
  console.log(`➖ src 删除文件: ${path}`);
  runBuild();
});

// 监听 dist 变化
distWatcher.on('ready', () => {
  console.log('👀 开始监听 dist 目录变化...');
});

// 添加 debounce 机制
let copyTimer = null;
function debouncedCopy() {
  if (copyTimer) {
    clearTimeout(copyTimer);
  }
  copyTimer = setTimeout(copyDistToDemo, 500);
}

distWatcher.on('change', path => {
  console.log(`📦 dist 文件变化: ${path}`);
  debouncedCopy();
});

distWatcher.on('add', path => {
  console.log(`📦 dist 新增文件: ${path}`);
  debouncedCopy();
});

distWatcher.on('unlink', path => {
  console.log(`📦 dist 删除文件: ${path}`);
  debouncedCopy();
});

// 错误处理
srcWatcher.on('error', error => {
  console.error('❌ src 监听错误:', error);
});

distWatcher.on('error', error => {
  console.error('❌ dist 监听错误:', error);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 停止监听...');
  srcWatcher.close();
  distWatcher.close();
  if (buildProcess) {
    buildProcess.kill();
  }
  process.exit(0);
});

console.log('\n🎯 测试说明:');
console.log('1. 修改 src 目录中的文件，观察是否触发构建');
console.log('2. 观察构建完成后，是否自动复制到 demo/static');
console.log('3. 按 Ctrl+C 停止测试');
