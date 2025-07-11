# Markdown River

[中文](./README.md) | **English**

An HTML safe renderer specifically designed for AI streaming output, solving the flickering issues caused by incomplete HTML tags in streaming scenarios.

## Features

- 🚀 **HTML Stream Rendering** - Specifically handles AI-generated HTML content, avoiding flickering from incomplete tags
- 🛡️ **Smart Tag Filtering** - Intelligently identifies and filters incomplete HTML tags, rendering only safe content
- 📏 **Precise Processing** - Distinguishes between HTML tags and comparison operators (like `a < b`)
- 🧠 **Code Block Awareness** - Correctly handles special characters within code blocks
- 🔧 **Event-Driven** - Clean event API, framework-agnostic
- 📦 **Zero Dependencies** - Core implementation has no external dependencies, extremely lightweight

## Installation

```bash
npm install markdown-river
# or
yarn add markdown-river
# or
pnpm add markdown-river
```

## Core Problem

In AI chat applications, backends typically output HTML content in a streaming fashion. Traditional innerHTML direct assignment leads to:

- **Tag Flickering**: Incomplete HTML tags (like `<div` or `</pr`) are displayed as text
- **Content Jumping**: When tags are completed, the interface suddenly changes from text to HTML elements
- **Poor Experience**: Users see obvious flickering and jumping

**Solution**: Only render complete HTML tags, wait for incomplete tags to be completed before displaying.

> 💡 **Why Choose HTML over Markdown?**  
> Read our in-depth analysis: [《Why Choose HTML over Markdown for Streaming Scenarios?》](./blog/why-html-over-markdown-for-streaming.md)

## Quick Start

### Basic Usage

```javascript
import { MarkdownRiver } from 'markdown-river';

// Create renderer instance
const river = new MarkdownRiver();

// Listen for HTML updates
river.onHtmlUpdate(html => {
  document.getElementById('output').innerHTML = html;
});

// Stream HTML content
river.write('<h1>Hello ');
river.write('<strong>Wo'); // Incomplete tag, won't display immediately
river.write('rld</strong></h1>'); // Tag complete, displays now
river.write('<p>This is safe ');
river.write('streaming!</p>');
```

### React Integration

```jsx
import { MarkdownRiver } from 'markdown-river';
import { useState, useEffect, useRef } from 'react';

function StreamingChatMessage({ htmlStream }) {
  const [html, setHtml] = useState('');
  const riverRef = useRef(new MarkdownRiver());

  useEffect(() => {
    const river = riverRef.current;

    // Register listener
    river.onHtmlUpdate(setHtml);

    // Cleanup function
    return () => {
      river.offHtmlUpdate(setHtml);
    };
  }, []);

  useEffect(() => {
    // Handle new HTML fragments
    if (htmlStream) {
      riverRef.current.write(htmlStream);
    }
  }, [htmlStream]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

## API Documentation

### MarkdownRiver

Main renderer class responsible for HTML stream processing and safe filtering.

#### Constructor

```typescript
new MarkdownRiver();
```

#### Core Methods

- `onHtmlUpdate(listener: (html: string) => void): void` - Register HTML update listener
- `offHtmlUpdate(listener: (html: string) => void): void` - Remove listener
- `write(chunk: string): void` - Write HTML fragment
- `reset(): void` - Reset state, clear all content
- `getStreamHtml(): string` - Get complete streaming HTML (including incomplete tags)
- `getSafeHtml(): string` - Get safe HTML (filtered incomplete tags)

#### Usage Example

```typescript
const river = new MarkdownRiver();

// Register listener
river.onHtmlUpdate(safeHtml => {
  console.log('Safe HTML:', safeHtml);
});

// Stream writing
river.write('<p>Hello '); // Output: '<p>Hello '
river.write('<strong>Wo'); // Output: '<p>Hello ' (incomplete tag filtered)
river.write('rld</strong>'); // Output: '<p>Hello <strong>World</strong>'
river.write('!</p>'); // Output: '<p>Hello <strong>World</strong>!</p>'
```

## Core Mechanism

### Smart Tag Filtering

Markdown River's core algorithm intelligently analyzes HTML content:

1. **Detect Incomplete Tags**: Identifies unclosed `<` tags at the end
2. **Code Block Awareness**: In `<pre><code>` blocks, `<` and `>` are treated as normal characters
3. **Comparison Operator Recognition**: Distinguishes between HTML tags and comparison operators (like `a < b`)
4. **HTML Entity Handling**: Correctly processes escaped characters like `&lt;` `&gt;`

### Processing Examples

```javascript
// Scenario 1: Incomplete HTML tags
river.write('<div class="container'); // Wait for tag completion
river.write('">Hello</div>'); // Tag complete, display immediately

// Scenario 2: Comparison operators
river.write('Price < 100 yuan'); // Display immediately, < is not a tag

// Scenario 3: Characters in code blocks
river.write('<pre><code>if (a < b)</code></pre>'); // < in code block displays normally

// Scenario 4: HTML entities
river.write('Escaped chars: &lt; &gt; &amp;'); // HTML entities display normally
```

## Advanced Usage

### Multiple Listeners Support

```javascript
const river = new MarkdownRiver();

// Listener 1: Update DOM
river.onHtmlUpdate(html => {
  document.getElementById('content').innerHTML = html;
});

// Listener 2: Count characters
river.onHtmlUpdate(html => {
  const textLength = html.replace(/<[^>]*>/g, '').length;
  document.getElementById('counter').textContent = `${textLength} characters`;
});

// Listener 3: Auto scroll
river.onHtmlUpdate(() => {
  window.scrollTo(0, document.body.scrollHeight);
});
```

### Error Handling and Debugging

```javascript
const river = new MarkdownRiver();

river.onHtmlUpdate(html => {
  try {
    // Business logic
    updateUI(html);
  } catch (error) {
    console.error('UI update failed:', error);
    // Other listeners are not affected
  }
});

// Debug: Compare streaming HTML and safe HTML
console.log('Streaming HTML:', river.getStreamHtml());
console.log('Safe HTML:', river.getSafeHtml());
```

### TypeScript Support

```typescript
import { MarkdownRiver } from 'markdown-river';

const river = new MarkdownRiver();

// Type-safe listener
const updateHandler = (html: string): void => {
  document.body.innerHTML = html;
};

river.onHtmlUpdate(updateHandler);

// Ensure type correctness
const safeHtml: string = river.getSafeHtml();
const streamHtml: string = river.getStreamHtml();
```

## Real-World Use Cases

### AI Chat Applications

```javascript
// Receive AI streaming response
async function handleAIResponse(stream) {
  const river = new MarkdownRiver();

  river.onHtmlUpdate(html => {
    updateChatMessage(html);
  });

  for await (const chunk of stream) {
    river.write(chunk.content);
  }
}
```

### Real-Time Document Editing

```javascript
// WebSocket real-time collaboration
websocket.onmessage = event => {
  const { type, content } = JSON.parse(event.data);

  if (type === 'content-update') {
    river.write(content);
  }
};
```

## Performance Features

- **Zero Dependencies**: Core code has no external dependencies, extremely small bundle size
- **Efficient Processing**: Only triggers listeners when HTML actually changes
- **Memory Friendly**: Minimal buffering, timely release of unnecessary data
- **Error Isolation**: Single listener errors don't affect other listeners

## Project Related

### Online Demo

Check out the [Online Demo](https://yarnovo.github.io/markdown-river) to experience the full functionality.

### Development and Testing

```bash
# Clone project
git clone https://github.com/yarnovo/markdown-river.git
cd markdown-river

# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build

# Start demo
npm run demo
```

### License

ISC License

---

**Why "Markdown River"?**

Although now focused on HTML processing, the project's original design philosophy was to make content render as smoothly as a river, without flickering and jumping. This name embodies the project's core goal: **smooth user experience**.
