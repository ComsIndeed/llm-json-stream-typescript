<div align="center">

# LLM JSON Stream

**The streaming JSON parser for AI applications**

[![npm package](https://img.shields.io/npm/v/llm_json_stream.svg)](https://www.npmjs.com/package/llm-json-stream)
[![TypeScript](https://img.shields.io/badge/TypeScript-%3E%3D5.0-blue)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

Parse JSON reactively as LLM responses stream in. Subscribe to properties and receive values chunk-by-chunk as they're generated—no waiting for the complete response.

[**Live Demo**](https://comsindeed.github.io/llm_json_stream/) · [**API Docs**](https://github.com/ComsIndeed/llm_json_stream) · [**GitHub**](https://github.com/ComsIndeed/llm_json_stream)

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
npm install llm_json_stream
```

```typescript
import { JsonStreamParser } from 'llm_json_stream';

// Works with any AsyncIterable<string>
// Compatible with: Node.js, Deno, Bun, browsers, Cloudflare Workers, etc.
const parser = new JsonStreamParser(llmResponseStream);

// Stream text as it types using async iteration
for await (const chunk of parser.getStringProperty('message')) {
  displayText += chunk;  // Update UI character-by-character
}

// Or get the complete value
const title = await parser.getStringProperty('title').promise;

// Clean up when done
await parser.dispose();
```

### ✨ Cross-Platform Compatibility

This library uses **only async iterables** (`AsyncIterable<string>`), making it 100% platform-agnostic:

- ✅ **Node.js** - All versions with async iterator support
- ✅ **Deno** - Native compatibility
- ✅ **Bun** - Native compatibility  
- ✅ **Browsers** - Works with native Web Streams via adapters
- ✅ **Cloudflare Workers** - Full support
- ✅ **Edge runtimes** - Compatible with all edge computing platforms

No Node.js `stream` module required! This avoids the compatibility issues that plague Node.js-specific libraries.

---

## How It Works

### Two APIs for Every Property

Every property gives you both an **async iterator** (incremental updates) and a **promise** (complete value):

```typescript
const title = parser.getStringProperty('title');

// Async iterator - each chunk as it arrives
for await (const chunk of title) {
  console.log(chunk);
}

// Promise - the final value
const complete = await title.promise;
```

| Use case | API |
|----------|-----|
| Typing effect, live updates | `for await...of` |
| Atomic values (IDs, flags, counts) | `.promise` |

### Path Syntax

Navigate JSON with dot notation and array indices:

```typescript
parser.getStringProperty('title')                    // Root property
parser.getStringProperty('user.name')                // Nested object
parser.getStringProperty('items[0].title')           // Array element
parser.getNumberProperty('data.users[2].age')        // Deep nesting
```

---

## Feature Highlights

### 🔤 Streaming Strings

Display text as the LLM generates it, creating a smooth typing effect:

```typescript
for await (const chunk of parser.getStringProperty('response')) {
  displayText += chunk;
  updateUI();
}
```

### 📋 Reactive Lists

Add items to your UI **the instant parsing begins**—even before their content arrives:

```typescript
const listStream = parser.getListProperty('articles');

listStream.onElement(async (article, index) => {
  // Fires IMMEDIATELY when "[{" is detected
  addArticlePlaceholder(index);
  
  // Fill in content as it streams (cast to access nested properties)
  const mapStream = article as MapPropertyStream;
  for await (const chunk of mapStream.getStringProperty('title')) {
    updateArticleTitle(index, chunk);
  }
});
```

**Traditional parsers** wait for complete objects → jarring UI jumps.  
**This approach** → smooth loading states that populate progressively.

### 🗺️ Reactive Maps

Maps support an `onProperty` callback that fires when each property starts parsing:

```typescript
const mapStream = parser.getMapProperty('user');

mapStream.onProperty((property, key) => {
  // Fires IMMEDIATELY when a property key is discovered
  console.log(`Property "${key}" started parsing`);
  
  // Subscribe to the property value as it streams
  if (property instanceof StringPropertyStream) {
    (async () => {
      for await (const chunk of property) {
        userFields[key] = (userFields[key] || '') + chunk;
      }
    })();
  }
});
```

### 🎯 All JSON Types

```typescript
parser.getStringProperty('name')      // String → streams chunks
parser.getNumberProperty('age')       // Number → int or double
parser.getBooleanProperty('active')   // Boolean  
parser.getNullProperty('deleted')     // Null
parser.getMapProperty('config')       // Object → Record<string, any>
parser.getListProperty('tags')        // Array → any[]
```

### ⛓️ Flexible API

Navigate complex structures with chained access:

```typescript
// Chain getters together
const user = parser.getMapProperty('user');
const name = await user.getStringProperty('name').promise;
const email = await user.getStringProperty('email').promise;

// Or go deep in one line
const city = await parser.getStringProperty('user.address.city').promise;
```

### 🎭 Smart Casts

Handle dynamic list elements with type casts:

```typescript
parser.getListProperty('items').onElement(async (element, index) => {
  // Cast to appropriate type to access type-specific methods
  const mapElement = element as MapPropertyStream;
  
  for await (const chunk of mapElement.getStringProperty('title')) {
    updateTitle(index, chunk);
  }
  
  const price = await mapElement.getNumberProperty('price').promise;
  updatePrice(index, price);
});
```

### 🔄 Buffered vs Unbuffered Streams

Property streams offer two modes to handle different subscription timing scenarios:

```typescript
const items = parser.getListProperty('items');

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
const parser = new JsonStreamParser(llmStream, {
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
import { JsonStreamParser, StringPropertyStream, MapPropertyStream } from 'llm_json_stream';

async function main() {
  // Your LLM stream (OpenAI, Claude, Gemini, etc.)
  const stream = await llm.streamChat("Generate a blog post as JSON");
  
  const parser = new JsonStreamParser(stream);
  
  // Title streams character-by-character
  (async () => {
    for await (const chunk of parser.getStringProperty('title')) {
      process.stdout.write(chunk);  // "H" "e" "l" "l" "o" " " "W" "o" "r" "l" "d"
    }
    console.log();
  })();
  
  // Sections appear the moment they start
  parser.getListProperty('sections').onElement(async (section, index) => {
    console.log(`Section ${index} detected!`);
    
    const sectionMap = section as MapPropertyStream;
    
    for await (const chunk of sectionMap.getStringProperty('heading')) {
      console.log(`  Heading chunk: ${chunk}`);
    }
    
    for await (const chunk of sectionMap.getStringProperty('body')) {
      console.log(`  Body chunk: ${chunk}`);
    }
  });
  
  // Wait for completion
  const allSections = await parser.getListProperty('sections').promise;
  console.log(`Done! Got ${allSections.length} sections`);
  
  await parser.dispose();
}
```

---

## API Reference

### Property Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `.getStringProperty(path)` | `StringPropertyStream` | Streams string chunks |
| `.getNumberProperty(path)` | `NumberPropertyStream` | Complete number value |
| `.getBooleanProperty(path)` | `BooleanPropertyStream` | Boolean value |
| `.getNullProperty(path)` | `NullPropertyStream` | Null value |
| `.getMapProperty(path)` | `MapPropertyStream` | Object with nested access |
| `.getListProperty(path)` | `ListPropertyStream` | Array with element callbacks |

### PropertyStream Interface

```typescript
// All property streams implement AsyncIterable
for await (const value of propertyStream) { ... }     // Buffered iteration
for await (const value of propertyStream.unbuffered()) { ... }  // Unbuffered

// Promise for complete value
const complete = await propertyStream.promise;
```

### ListPropertyStream

```typescript
listStream.onElement((element, index) => {
  // Callback when element parsing starts
});
```

### MapPropertyStream

```typescript
mapStream.onProperty((property, key) => {
  // Callback when property parsing starts
});
```

### Cleanup

Always dispose the parser when you're done:

```typescript
await parser.dispose();
```

### Constructor Options

```typescript
new JsonStreamParser(stream: Readable, {
  closeOnRootComplete?: boolean  // Stop parsing after root JSON completes (default: true)
});
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
import { JsonStreamParser } from 'llm_json_stream';

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

const parser = new JsonStreamParser(openaiStream());
```

</details>

<details>
<summary><strong>Anthropic Claude</strong></summary>

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { JsonStreamParser } from 'llm_json_stream';

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

const parser = new JsonStreamParser(claudeStream());
```

</details>

<details>
<summary><strong>Google Gemini</strong></summary>

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JsonStreamParser } from 'llm_json_stream';

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

const parser = new JsonStreamParser(geminiStream());
```

</details>

---

## Architecture

This package implements a **character-by-character JSON state machine** with a reactive, streaming API designed specifically for handling LLM streaming responses.

### Core Components

#### 1. **Parser Core**
- `JsonStreamParser` - Main parser class that consumes input streams
- `JsonStreamParserController` - Internal coordinator for parsing operations

#### 2. **Property Streams** (Public API)
- `StringPropertyStream` - Streams string content chunk-by-chunk
- `NumberPropertyStream` - Emits complete number values
- `BooleanPropertyStream` - Emits boolean values
- `NullPropertyStream` - Emits null values
- `MapPropertyStream` - Provides access to object properties
- `ListPropertyStream` - Provides reactive array handling with `onElement` callbacks

#### 3. **Property Delegates** (Internal State Machine)
Delegates handle character-by-character parsing for each JSON type:
- `StringPropertyDelegate` - Handles strings with escape sequences
- `NumberPropertyDelegate` - Handles number parsing
- `BooleanPropertyDelegate` - Handles true/false
- `NullPropertyDelegate` - Handles null
- `MapPropertyDelegate` - Handles object parsing
- `ListPropertyDelegate` - Handles array parsing

### Design Patterns

- **State Machine**: Character-by-character parsing with delegates
- **Async Iterators**: Modern streaming via `for await...of`
- **Promise-based Futures**: Async access to complete values
- **Factory Pattern**: Delegate creation based on first character
- **Controller Pattern**: Separation of public API from internal logic

## Project Structure

```
src/
├── classes/
│   ├── json_stream_parser.ts           # Main parser
│   ├── property_stream.ts              # Public API property streams
│   ├── property_stream_controller.ts   # Internal controllers
│   ├── mixins.ts                       # Factory functions
│   └── property_delegates/             # State machine workers
│       ├── property_delegate.ts
│       ├── string_property_delegate.ts
│       ├── number_property_delegate.ts
│       ├── boolean_property_delegate.ts
│       ├── null_property_delegate.ts
│       ├── map_property_delegate.ts
│       └── list_property_delegate.ts
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

1. Check [open issues](https://github.com/ComsIndeed/llm_json_stream/issues)
2. Open an issue before major changes  
3. Run `npm test` before submitting
4. Match existing code style

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Made for TypeScript developers building the next generation of AI-powered apps**

[⭐ Star](https://github.com/ComsIndeed/llm_json_stream) · [📦 npm](https://www.npmjs.com/package/llm_json_stream) · [🐛 Issues](https://github.com/ComsIndeed/llm_json_stream/issues)

</div>

## Credits

This is a TypeScript port of the [Dart llm_json_stream package](https://pub.dev/packages/llm_json_stream).
