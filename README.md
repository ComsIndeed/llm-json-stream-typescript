<div align="center">

# LLM JSON Stream

**The streaming JSON parser for AI applications**

[![npm package](https://img.shields.io/npm/v/llm-json-stream.svg)](https://www.npmjs.com/package/llm-json-stream)
[![TypeScript](https://img.shields.io/badge/TypeScript-%3E%3D5.0-blue)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

Parse JSON reactively as LLM responses stream in. Subscribe to properties and receive values chunk-by-chunk as they're generated—no waiting for the complete response.

![Demo GIF](https://raw.githubusercontent.com/ComsIndeed/llm-json-stream-typescript/main/assets/main-demo.gif)

[**Live Demo**](https://comsindeed.github.io/llm-json-stream-typescript/) · [**API Docs**](https://github.com/ComsIndeed/llm-json-stream-typescript) · [**GitHub**](https://github.com/ComsIndeed/llm-json-stream-typescript)

</div>

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Feature Highlights](#feature-highlights)
  - [Streaming Strings](#-streaming-strings)
  - [Reactive Lists](#-reactive-lists)
  - [Reactive Maps](#-reactive-maps)
  - [All JSON Types](#-all-json-types)
  - [Flexible API](#️-flexible-api)
  - [Smart Casts](#-smart-casts)
  - [Buffered vs Unbuffered Streams](#-buffered-vs-unbuffered-streams)
  - [Yap Filter](#-yap-filter-closeonrootcomplete)
- [Complete Example](#complete-example)
- [API Reference](#api-reference)
- [Robustness](#robustness)
- [LLM Provider Setup](#llm-provider-setup)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

LLM APIs stream responses token-by-token. When the response is JSON, you get incomplete fragments:

```
{"title": "My Bl
{"title": "My Blog Po
{"title": "My Blog Post", "content": "This is
```

**`JSON.parse()` fails on partial JSON.** Your options aren't great:

| Approach | Problem |
|----------|---------|
| Wait for complete response | High latency, defeats streaming |
| Display raw chunks | Broken JSON in your UI |
| Build a custom parser | Complex, error-prone, weeks of work |

## The Solution

LLM JSON Stream parses JSON **character-by-character** as it arrives, allowing you to subscribe to specific properties and react to their values the moment they're available.

Instead of waiting for the entire JSON response to complete, you can:
- Display text fields progressively as they stream in
- Add list items to your UI the instant they begin parsing
- Await complete values for properties that need them (like IDs or flags)

---

## Quick Start

```bash
npm install llm-json-stream
```

```typescript
import { JsonStream } from 'llm-json-stream';

// Works with any AsyncIterable<string>
// Compatible with: Node.js, Deno, Bun, browsers, Cloudflare Workers, etc.
const stream = JsonStream.parse(llmResponseStream);

// Stream text as it types using async iteration
for await (const chunk of stream.get<string>('message')) {
  displayText += chunk;  // Update UI character-by-character
}

// Or get the complete value
const title = await stream.get<string>('title');

// Clean up when done
await stream.dispose();
```

### ✨ Cross-Platform Compatibility

This library uses **only async iterables** (`AsyncIterable<string>`), making it 100% platform-agnostic:

- ✅ **Node.js** - All versions with async iterator support
- ✅ **Deno** - Native compatibility
- ✅ **Bun** - Native compatibility  
- ✅ **Browsers** - Works with native Web Streams via adapters
- ✅ **Cloudflare Workers** - Full support
- ✅ **Edge runtimes** - Compatible with all edge computing platforms

**No polyfills required!** This library uses standard `AsyncIterable`, which is natively supported everywhere now. Unlike Node.js `stream` libraries that break in the browser, this works seamlessly across all platforms.

---

## How It Works

### Two APIs for Every Property

Every property gives you both an **async iterator** (incremental updates) and a **promise** (complete value):

```typescript
const title = stream.get<string>('title');

// Async iterator - each chunk as it arrives
for await (const chunk of title) {
  console.log(chunk);
}

// Promise - the final value
const complete = await title;
```

| Use case | API |
|----------|-----|
| Typing effect, live updates | `for await...of` |
| Atomic values (IDs, flags, counts) | `await` directly |

### Path Syntax

Navigate JSON with dot notation and array indices:

```typescript
stream.get<string>('title')                    // Root property
stream.get<string>('user.name')                // Nested object
stream.get<string>('items[0].title')           // Array element
stream.get<number>('data.users[2].age')        // Deep nesting
```

---

## Feature Highlights

### 🔤 Streaming Strings

Display text as the LLM generates it, creating a smooth typing effect:

```typescript
for await (const chunk of stream.get<string>('response')) {
  displayText += chunk;
  updateUI();
}
```

### 📋 Reactive Lists

Add items to your UI **the instant parsing begins**—even before their content arrives:

```typescript
const articles = stream.get<Article[]>('articles');

for await (const article of articles) {
  // Each iteration emits a snapshot of the array as it grows
  console.log(`Current array length: ${article.length}`);
  
  // Access the latest article
  const latest = article[article.length - 1];
  if (latest) {
    // Stream the title as it arrives
    for await (const chunk of latest.get<string>('title')) {
      updateArticleTitle(article.length - 1, chunk);
    }
  }
}
```

**Or use the path-based API for cleaner code:**

```typescript
const articles = stream.paths().articles;

for await (const articleList of articles) {
  for (let i = 0; i < articleList.length; i++) {
    const title = await articleList[i].title;
    console.log(`Article ${i}: ${title}`);
  }
}
```

**Traditional parsers** wait for complete objects → jarring UI jumps.  
**This approach** → smooth loading states that populate progressively.

### 🗺️ Reactive Maps

Maps stream their properties as they're discovered. You can iterate over snapshots to see the object build up:

```typescript
const user = stream.get<User>('user');

// Stream snapshots as properties arrive
for await (const snapshot of user) {
  console.log('Current user state:', snapshot);
  // First: {}
  // Then: { name: "Alice" }
  // Then: { name: "Alice", age: 30 }
  // Finally: { name: "Alice", age: 30, email: "alice@example.com" }
}

// Or use the path-based API for direct access
const userPaths = stream.paths().user;
const name = await userPaths.name;
const age = await userPaths.age;
```

### 🎯 All JSON Types

```typescript
stream.get<string>('name')      // String → streams chunks
stream.get<number>('age')       // Number → int or double
stream.get<boolean>('active')   // Boolean  
stream.get<null>('deleted')     // Null
stream.get<object>('config')    // Object → Record<string, any>
stream.get<any[]>('tags')       // Array → any[]
```

**Or use the type-safe path API:**

```typescript
interface User {
  name: string;
  age: number;
  active: boolean;
}

const stream = JsonStream.parse<User>(response);
const paths = stream.paths();

// Full TypeScript autocomplete!
const name: string = await paths.name;
const age: number = await paths.age;
const active: boolean = await paths.active;
```

### ⛓️ Flexible API

Navigate complex structures with chained access:

```typescript
// Use .get() with paths
const name = await stream.get<string>('user.name');
const email = await stream.get<string>('user.email');
const city = await stream.get<string>('user.address.city');

// Or use the ergonomic .paths() API
const paths = stream.paths();
const name2 = await paths.user.name;
const email2 = await paths.user.email;
const city2 = await paths.user.address.city;
```

### 🎭 Type Safety with Schemas

Define your schema once and get full TypeScript support:

```typescript
interface Item {
  title: string;
  price: number;
}

interface Response {
  items: Item[];
}

const stream = JsonStream.parse<Response>(llmResponse);
const paths = stream.paths();

// TypeScript knows the types!
for await (const items of paths.items) {
  for (const item of items) {
    const title: string = await item.title;  // Inferred as string
    const price: number = await item.price;  // Inferred as number
    updateUI(title, price);
  }
}
```

### 🔄 Buffered vs Unbuffered Streams

Property streams offer two modes to handle different subscription timing scenarios:

```typescript
const items = stream.get<Item[]>('items');

// Recommended: Buffered iteration (replays values to new subscribers)
for await (const snapshot of items) {
  // Will receive the LATEST state immediately, then continue with live updates
  // Safe for late subscriptions - no race conditions!
}

// Alternative: Unbuffered iteration (live only, no replay)
for await (const snapshot of items.unbuffered()) {
  // Only receives values emitted AFTER subscription
  // Use when you explicitly want live-only behavior
}
```

| Stream Type | Behavior | Use Case |
|-------------|----------|----------|
| `for await...of` | Replays latest value, then live | **Recommended** — prevents race conditions |
| `.unbuffered()` | Live values only, no replay | When you need live-only behavior |

**Memory efficient**: Maps and Lists only buffer the latest state (O(1) memory), not the full history. Strings buffer chunks for accumulation.

### 🛑 Yap Filter (closeOnRootComplete)

Some LLMs "yap" after the JSON—adding explanatory text that can confuse downstream processing. The `closeOnRootComplete` option stops parsing the moment the root JSON object/array is complete:

```typescript
const stream = JsonStream.parse(llmStream, {
  closeOnRootComplete: true  // Stop after root JSON completes (default: true)
});

// Input: '{"data": 123} Hope this helps! Let me know if you need anything else.'
// Parser stops after '}' — the trailing text is ignored
```

This is especially useful when:
- Your LLM tends to add conversational text after JSON
- You want to minimize processing overhead
- You're building a pipeline where only the JSON matters

---

## Complete Example

A realistic scenario: parsing a blog post with streaming title and reactive sections.

```typescript
import { JsonStream } from 'llm-json-stream';

interface Section {
  heading: string;
  body: string;
}

interface BlogPost {
  title: string;
  sections: Section[];
}

async function main() {
  // Your LLM stream (OpenAI, Claude, Gemini, etc.)
  const llmStream = await llm.streamChat("Generate a blog post as JSON");
  
  const stream = JsonStream.parse<BlogPost>(llmStream);
  const blog = stream.paths();
  
  // Title streams character-by-character
  (async () => {
    for await (const chunk of blog.title) {
      process.stdout.write(chunk);  // "H" "e" "l" "l" "o" " " "W" "o" "r" "l" "d"
    }
    console.log();
  })();
  
  // Sections appear as they stream
  (async () => {
    for await (const sections of blog.sections) {
      console.log(`Got ${sections.length} sections so far`);
      
      // Process the latest section
      const latest = sections[sections.length - 1];
      if (latest) {
        for await (const chunk of latest.heading) {
          console.log(`  Heading chunk: ${chunk}`);
        }
        
        for await (const chunk of latest.body) {
          console.log(`  Body chunk: ${chunk}`);
        }
      }
    }
  })();
  
  // Wait for completion
  const allSections = await blog.sections;
  console.log(`Done! Got ${allSections.length} sections`);
  
  await stream.dispose();
}
```

---

## API Reference

### Creating a Stream

```typescript
// Without schema (dynamic)
const stream = JsonStream.parse(asyncIterableStream);

// With schema (typed)
interface MySchema {
  name: string;
  age: number;
}
const stream = JsonStream.parse<MySchema>(asyncIterableStream);

// With options
const stream = JsonStream.parse(asyncIterableStream, {
  closeOnRootComplete: true  // Stop after root JSON completes
});
```

### Accessing Properties

#### Manual Access with `.get<T>(path)`

```typescript
// Returns AsyncJson<T> - both a Promise and AsyncIterable
const name = stream.get<string>('user.name');

// Use as a promise
const nameValue: string = await name;

// Use as an async iterable
for await (const chunk of name) {
  console.log(chunk);
}

// Access nested properties
const email = stream.get<string>('user.contact.email');
const age = stream.get<number>('users[0].age');
```

#### Path-based Access with `.paths()`

```typescript
// Get the typed proxy object
const paths = stream.paths();

// Direct property access with TypeScript autocomplete
const name: string = await paths.user.name;

// Stream chunks
for await (const chunk of paths.user.bio) {
  console.log(chunk);
}

// Array access
const firstUser = paths.users[0];
const email = await firstUser.email;

// Chained access
const city = await paths.user.address.city;
```

### AsyncJson Interface

Both `.get<T>()` and `.paths()` return `AsyncJson<T>` values:

```typescript
// AsyncJson<T> is both a Promise and an AsyncIterable
interface AsyncJson<T> extends Promise<T>, AsyncIterable<T> {
  get<U>(path: string): AsyncJson<U>;  // Nested access
  unbuffered(): AsyncIterable<T>;       // Live-only iteration
}
```

### Supported Types

All JSON types are supported:

| Type | Example |
|------|---------|
| String | `stream.get<string>('name')` |
| Number | `stream.get<number>('age')` |
| Boolean | `stream.get<boolean>('active')` |
| Null | `stream.get<null>('deleted')` |
| Object | `stream.get<User>('user')` |
| Array | `stream.get<User[]>('users')` |

### Cleanup

Always dispose the stream when you're done:

```typescript
await stream.dispose();
```

---

## Robustness

Battle-tested with comprehensive test coverage. Handles real-world edge cases:

| Category | What's Covered |
|----------|----------------|
| **Escape sequences** | `\"`, `\\`, `\n`, `\t`, `\r`, `\uXXXX` |
| **Unicode** | Emoji 🎉, CJK characters, RTL text |
| **Numbers** | Scientific notation (`1.5e10`), negative, decimals |
| **Whitespace** | Multiline JSON, arbitrary formatting |
| **Nesting** | 5+ levels deep |
| **Scale** | 10,000+ element arrays |
| **Chunk boundaries** | Any size, splitting any token |
| **LLM quirks** | Trailing commas, markdown wrappers (auto-stripped) |

---

## LLM Provider Setup

<details>
<summary><strong>OpenAI</strong></summary>

```typescript
import OpenAI from 'openai';
import { JsonStream } from 'llm-json-stream';

const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Generate a JSON blog post' }],
  stream: true,
});

// Create an async generator that yields text chunks
async function* openaiStream() {
  for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) yield content;
  }
}

const stream = JsonStream.parse(openaiStream());
```

</details>

<details>
<summary><strong>Anthropic Claude</strong></summary>

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { JsonStream } from 'llm-json-stream';

const anthropic = new Anthropic();

const stream = await anthropic.messages.stream({
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Generate a JSON blog post' }],
});

// Create an async generator from Claude's event emitter
async function* claudeStream() {
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}

const jsonStream = JsonStream.parse(claudeStream());
```

</details>

<details>
<summary><strong>Google Gemini</strong></summary>

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JsonStream } from 'llm-json-stream';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const response = await model.generateContentStream('Generate a JSON blog post');

// Create an async generator that yields text chunks
async function* geminiStream() {
  for await (const chunk of response.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

const stream = JsonStream.parse(geminiStream());
```

</details>

---

## Architecture

This package implements a **character-by-character JSON state machine** with a reactive, streaming API designed specifically for handling LLM streaming responses.

### Core Components

#### 1. **Parser Core**
- `JsonStream` - Main class with `.parse()` static method
- `JsonStreamController` - Internal coordinator for parsing operations

#### 2. **Unified Property API**
- `AsyncJson<T>` - Unified interface that is both Promise and AsyncIterable
- `.get<T>(path)` - Manual string-based property access
- `.paths()` - Proxy-based ergonomic property access with TypeScript autocomplete

#### 3. **Property Delegates** (Internal State Machine)
Delegates handle character-by-character parsing for each JSON type:
- `StringPropertyDelegate` - Handles strings with escape sequences
- `NumberPropertyDelegate` - Handles number parsing
- `BooleanPropertyDelegate` - Handles true/false
- `NullPropertyDelegate` - Handles null
- `ObjectPropertyDelegate` - Handles object parsing
- `ArrayPropertyDelegate` - Handles array parsing

### Design Patterns

- **State Machine**: Character-by-character parsing with delegates
- **Async Iterators**: Modern streaming via `for await...of`
- **Thenable Interface**: Direct `await` support without `.promise`
- **Proxy Pattern**: Ergonomic property access via `.paths()`
- **Factory Pattern**: Delegate creation based on first character
- **Controller Pattern**: Separation of public API from internal logic

## Project Structure

```
src/
├── classes/
│   ├── json_stream.ts                  # Main JsonStream class with .parse()
│   ├── property_stream.ts              # AsyncJson implementation
│   ├── property_stream_controller.ts   # Internal controllers
│   ├── mixins.ts                       # Factory functions & helpers
│   └── property_delegates/             # State machine workers
│       ├── property_delegate.ts
│       ├── string_property_delegate.ts
│       ├── number_property_delegate.ts
│       ├── boolean_property_delegate.ts
│       ├── null_property_delegate.ts
│       ├── object_property_delegate.ts
│       └── array_property_delegate.ts
├── utilities/
│   └── stream_text_in_chunks.ts        # Test utility
└── index.ts                             # Public exports

test/
├── properties/                          # Property-type specific tests
│   ├── string_property.test.ts
│   ├── number_property.test.ts
│   ├── boolean_property.test.ts
│   ├── null_property.test.ts
│   ├── map_property.test.ts
│   └── list_property.test.ts
└── [integration tests]                  # Comprehensive test suites
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch
```

---

## Contributing

Contributions welcome!

1. Check [open issues](https://github.com/ComsIndeed/llm-json-stream-typescript/issues)
2. Open an issue before major changes  
3. Run `npm test` before submitting
4. Match existing code style

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Made for TypeScript developers building the next generation of AI-powered apps**

[⭐ Star](https://github.com/ComsIndeed/llm-json-stream-typescript) · [📦 npm](https://www.npmjs.com/package/llm-json-stream) · [🐛 Issues](https://github.com/ComsIndeed/llm-json-stream-typescript/issues)

</div>

## Credits

This is a TypeScript port of the [Dart llm_json_stream package](https://pub.dev/packages/llm_json_stream).
