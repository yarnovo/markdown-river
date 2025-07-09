#!/usr/bin/env node
import { cp, access } from 'fs/promises';
import { rimraf } from 'rimraf';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const staticDir = join(rootDir, 'demo', 'static');

async function copyDistToDemo() {
  try {
    // 检查 dist 目录是否存在
    try {
      await access(distDir);
    } catch {
      console.log('⏳ Waiting for dist directory to be created...');
      return;
    }

    // 清理旧的 static 目录
    await rimraf(staticDir);

    // 复制 dist 到 demo/static
    await cp(distDir, staticDir, { recursive: true });

    console.log('✓ Copied dist to demo/static');
  } catch (error) {
    console.error('Error copying dist to demo/static:', error);
    process.exit(1);
  }
}

copyDistToDemo();
