#!/usr/bin/env node
import { watch } from 'chokidar';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');

console.log('🚀 启动 demo:watch 模式...');

let buildProcess = null;
let isBuilding = false;
let copyTimer = null;
let serveProcess = null;

// 构建函数
function runBuild() {
  if (isBuilding) {
    console.log('⏳ 构建中，跳过此次触发...');
    return;
  }

  isBuilding = true;
  console.log('🔨 开始构建...');

  // 终止之前的构建进程
  if (buildProcess) {
    buildProcess.kill();
  }

  buildProcess = spawn('npm', ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  buildProcess.on('close', code => {
    isBuilding = false;
    buildProcess = null;

    if (code === 0) {
      console.log('✅ 构建完成');
      // 构建成功后，复制到 demo
      debouncedCopy();
    } else {
      console.log('❌ 构建失败');
    }
  });

  buildProcess.on('error', error => {
    isBuilding = false;
    buildProcess = null;
    console.error('❌ 构建进程错误:', error);
  });
}

// 复制 dist 到 demo（带 debounce）
function debouncedCopy() {
  if (copyTimer) {
    clearTimeout(copyTimer);
  }

  copyTimer = setTimeout(() => {
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
  }, 500);
}

// 启动开发服务器
function startServe() {
  console.log('🌐 启动开发服务器...');

  serveProcess = spawn('npx', ['serve', 'demo', '-p', '3000'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  serveProcess.on('close', code => {
    console.log(`🛑 开发服务器退出，代码: ${code}`);
  });

  serveProcess.on('error', error => {
    console.error('❌ 开发服务器错误:', error);
  });
}

// 初始化构建和启动
async function init() {
  console.log('🏗️ 执行初始构建...');

  const initialBuild = spawn('npm', ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  initialBuild.on('close', code => {
    if (code === 0) {
      console.log('✅ 初始构建完成');

      // 复制到 demo
      const copyProcess = spawn('npm', ['run', 'copy-dist'], {
        cwd: rootDir,
        stdio: 'inherit',
      });

      copyProcess.on('close', copyCode => {
        if (copyCode === 0) {
          console.log('✅ 初始复制完成');

          // 启动开发服务器
          startServe();

          // 开始监听文件变化
          console.log('👀 开始监听文件变化...');
          startWatching();
        } else {
          console.log('❌ 初始复制失败');
          process.exit(1);
        }
      });
    } else {
      console.log('❌ 初始构建失败');
      process.exit(1);
    }
  });
}

// 开始监听文件变化
function startWatching() {
  // 只监听 src 目录变化
  const srcWatcher = watch(srcDir, {
    ignored: [
      /(^|[/\\])\../, // 忽略隐藏文件
      /node_modules/,
      /dist/,
      /demo/,
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  srcWatcher.on('ready', () => {
    console.log('👀 开始监听 src 目录变化...');
    console.log('📝 修改 src 文件将自动触发构建和复制');
  });

  srcWatcher.on('change', path => {
    console.log(`📝 文件变化: ${path}`);
    runBuild();
  });

  srcWatcher.on('add', path => {
    console.log(`➕ 新增文件: ${path}`);
    runBuild();
  });

  srcWatcher.on('unlink', path => {
    console.log(`➖ 删除文件: ${path}`);
    runBuild();
  });

  srcWatcher.on('error', error => {
    console.error('❌ 文件监听错误:', error);
  });

  // 返回 watcher 以便清理
  return srcWatcher;
}

// 优雅退出
function gracefulExit() {
  console.log('\n🛑 正在停止所有进程...');

  if (buildProcess) {
    buildProcess.kill();
  }

  if (serveProcess) {
    serveProcess.kill();
  }

  if (copyTimer) {
    clearTimeout(copyTimer);
  }

  process.exit(0);
}

// 注册退出处理
process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);

// 启动
init();
