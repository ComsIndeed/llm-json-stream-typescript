# TypeScript JSON Stream Parser - Architecture & Design Summary

## Architecture Overview

The TypeScript JSON Stream Parser is a **character-by-character state machine** that parses JSON reactively as it streams in. This is essential for LLM streaming responses where JSON arrives in incomplete chunks.

### Core Design Principles

1. **Reactive Streaming**: Values emit as they're parsed, not just when complete
2. **Character-by-Character**: No waiting for complete tokens or chunks
3. **Type-Safe**: Separate stream types for each JSON value type
4. **Path-Based Access**: Dot notation for nested properties (`user.profile.name`)
5. **Memory Efficient**: Minimal buffering, streaming string content

## Component Architecture

### Layer 1: Public API

**JsonStreamParser** - Main entry point
- Constructor: Takes a `Readable` stream
- Methods: `getStringProperty()`, `getNumberProperty()`, `getBooleanProperty()`, `getNullProperty()`, `getMapProperty()`, `getListProperty()`
- Method: `dispose()` for cleanup

**PropertyStream Classes** - What users interact with
- `StringPropertyStream` - Has `.stream` (EventEmitter) and `.future` (Promise)
- `NumberPropertyStream` - Has `.stream` and `.future`
- `BooleanPropertyStream` - Has `.stream` and `.future`
- `NullPropertyStream` - Has `.stream` and `.future`
- `MapPropertyStream` - Has `.future` and chainable getters (future feature)
- `ListPropertyStream` - Has `.future` and `.onElement()` callback

### Layer 2: Internal Controllers

**JsonStreamParserController** - Coordinates parsing operations
- Tracks property paths
- Routes character data to appropriate delegates
- Manages property stream controllers

**PropertyStreamController Classes** - Manage emission logic
- `StringPropertyStreamController` - Buffers and emits string chunks
- `NumberPropertyStreamController` - Accumulates digits, emits complete number
- `BooleanPropertyStreamController` - Emits boolean when complete
- `NullPropertyStreamController` - Emits null when complete
- `MapPropertyStreamController` - Manages object completion
- `ListPropertyStreamController` - Manages array elements and callbacks

### Layer 3: State Machine (Delegates)

**PropertyDelegate (Abstract Base)**
- `addCharacter(char)` - Process one character
- `onChunkEnd()` - Handle chunk boundaries
- `addPropertyChunk()` - Emit values to streams

**Concrete Delegates** - Each handles specific JSON type
- `StringPropertyDelegate` - Handles escape sequences, quotes, streaming chunks
- `NumberPropertyDelegate` - Accumulates digits, handles scientific notation
- `BooleanPropertyDelegate` - Matches "true" or "false"
- `NullPropertyDelegate` - Matches "null"
- `MapPropertyDelegate` - Handles `{`, keys, values, `}`
- `ListPropertyDelegate` - Handles `[`, elements, `,`, `]`

### Helper Components

**createDelegate()** - Factory function
- Takes first character and returns appropriate delegate
- Handles: `{`, `[`, `"`, digits, `t/f`, `n`

**streamTextInChunks()** - Test utility
- Simulates LLM streaming
- Configurable chunk size and interval

## Data Flow

```
Input Stream
    ↓
JsonStreamParser (reads chunks)
    ↓
Character-by-character processing
    ↓
Delegates (parse and emit)
    ↓
PropertyStreamControllers (buffer and manage)
    ↓
PropertyStreams (public API)
    ↓
User callbacks and promises
```

## Key Architectural Patterns

### 1. State Machine Pattern
Each delegate maintains state and transitions based on characters:
- StringDelegate: `START → IN_STRING → ESCAPE → END`
- NumberDelegate: `DIGITS → DECIMAL → EXPONENT → END`
- MapDelegate: `START → KEY → COLON → VALUE → COMMA/END`

### 2. Delegation Pattern
Main parser delegates work to specialized classes based on JSON type encountered.

### 3. Observer Pattern
Streams emit events that multiple listeners can subscribe to.

### 4. Promise Pattern
Futures provide async access to complete values without callbacks.

### 5. Factory Pattern
`createDelegate()` creates appropriate delegate based on first character.

## Test Structure

### Property Tests (test/properties/)
One file per JSON type, testing:
- Basic value parsing
- Edge cases (empty, escape sequences, etc.)
- Chunking behavior
- Nested access

### Integration Tests (test/)
- **comprehensive_demo.test.ts** - Various chunk sizes and speeds
- **comprehensive_value_retrieval.test.ts** - Complex access patterns
- **error_handling.test.ts** - Errors and edge cases
- **disposal.test.ts** - Resource cleanup
- **buffer_flush.test.ts** - Chunk boundary handling
- **multiline_json.test.ts** - Whitespace handling
- **stream_completion.test.ts** - Completion behavior
- **critical_bug.test.ts** - Regression tests
- **debug_nested_list.test.ts** - Complex nesting
- **bug_diagnosis.test.ts** - Debugging scenarios

## File Structure

```
src/
├── classes/
│   ├── json_stream_parser.ts              # Main parser + controller
│   ├── property_stream.ts                 # Public API classes
│   ├── property_stream_controller.ts      # Internal controllers
│   ├── mixins.ts                          # Factory functions
│   └── property_delegates/                # State machine
│       ├── property_delegate.ts           # Base class
│       ├── string_property_delegate.ts
│       ├── number_property_delegate.ts
│       ├── boolean_property_delegate.ts
│       ├── null_property_delegate.ts
│       ├── map_property_delegate.ts
│       └── list_property_delegate.ts
├── utilities/
│   └── stream_text_in_chunks.ts           # Test helper
└── index.ts                                # Public exports

test/
├── properties/                             # 6 property test files
└── [10 integration test files]
```

## Implementation Notes

### Current Status
- ✅ All boilerplate classes created
- ✅ All test files scaffolded
- ✅ Architecture documented
- ⏳ Logic implementation pending
- ⏳ Test implementations pending

### Key Implementation Tasks (Future)
1. Implement character processing in each delegate
2. Implement buffering and emission in controllers
3. Implement path resolution in main parser
4. Implement stream/promise coordination
5. Implement escape sequence handling
6. Implement chunk boundary handling
7. Implement nested structure traversal
8. Write actual test implementations
9. Add error handling
10. Add disposal logic

### Differences from Dart Version

**TypeScript Adaptations:**
- `Stream<T>` → `EventEmitter` with 'data' events
- `Future<T>` → `Promise<T>`
- Dart mixins → TypeScript factory functions
- `late` keyword → TypeScript `!` or constructor initialization

**Node.js Streams:**
- Using `Readable` from Node.js `stream` module
- EventEmitter for reactive emissions

## Usage Example (Planned)

```typescript
import { JsonStreamParser } from 'llm_json_stream';
import { Readable } from 'stream';

// Create stream from LLM
const llmStream: Readable = getLLMResponse();

// Create parser
const parser = new JsonStreamParser(llmStream);

// Get string property with streaming
const title = parser.getStringProperty('title');
title.stream.on('data', (chunk: string) => {
  console.log('Title chunk:', chunk);
  // Update UI incrementally
});

// Get complete value
const age = await parser.getNumberProperty('age').future;
console.log('Age:', age);

// React to array elements
const items = parser.getListProperty('items');
items.onElement((element, index) => {
  console.log(`Element ${index} started`);
  // Set up subscriptions for this element
});

// Nested property access
const name = await parser.getStringProperty('user.profile.name').future;

// Cleanup
await parser.dispose();
```

## Next Steps

Before implementing logic:
1. ✅ Review architecture and design
2. ✅ Create all boilerplate
3. ✅ Scaffold all tests
4. 🔜 Install dependencies (`npm install`)
5. 🔜 Begin implementing delegates (start with simple types)
6. 🔜 Implement controllers
7. 🔜 Implement main parser
8. 🔜 Write test implementations
9. 🔜 Debug and iterate

---

**Created:** November 18, 2025
**Status:** Architecture complete, ready for implementation
