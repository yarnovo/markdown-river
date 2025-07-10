import { OptimisticParser } from './dist/src/core/optimistic-parser.js';
import { EventBus } from './dist/src/infrastructure/event-bus.js';

const eventBus = new EventBus();
const parser = new OptimisticParser({ eventBus });
const tokens = [];

eventBus.on('parser:token', event => {
  tokens.push(event.token);
  console.log('Token:', event.token);
});

// 调试 *italic* 后跟空格
console.log('=== Testing *italic* + space ===');
const input = '*italic* ';
for (const char of input) {
  console.log(`Processing: "${char}"`);
  parser.processChar(char);
}

console.log('\nTokens with space:', tokens);

// 重置并测试文件结束
parser.reset();
tokens.length = 0;
console.log('\n=== Testing *italic* + end ===');
const input2 = '*italic*';
for (const char of input2) {
  console.log(`Processing: "${char}"`);
  parser.processChar(char);
}

console.log('\nBefore end:', tokens);
parser.end();
console.log('After end:', tokens);
