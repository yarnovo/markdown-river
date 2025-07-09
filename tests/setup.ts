import { afterAll } from 'vitest';
import { rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 全局清理函数，确保所有测试目录都被清理
afterAll(async () => {
  const testReposDir = join(__dirname, '..', '.test-repos');

  try {
    // 清理整个测试目录
    await rm(testReposDir, { recursive: true, force: true });
    console.log('✅ 测试目录已清理');
  } catch (error) {
    // 如果目录不存在，忽略错误
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('Failed to clean up test repositories directory:', error);
    }
  }
});
