# LLM JSON Stream (TypeScript)

A streaming JSON parser for TypeScript optimized for LLM responses.

## Status

🚧 **In Development** - This is a TypeScript port of the Dart package. The architecture and tests are scaffolded, but implementation is in progress.

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

#### 3. **Property Stream Controllers** (Internal)
Controllers manage internal state and emission logic for each property type.

#### 4. **Property Delegates** (Internal State Machine)
Delegates handle character-by-character parsing for each JSON type:
- `StringPropertyDelegate` - Handles strings with escape sequences
- `NumberPropertyDelegate` - Handles number parsing
- `BooleanPropertyDelegate` - Handles true/false
- `NullPropertyDelegate` - Handles null
- `MapPropertyDelegate` - Handles object parsing
- `ListPropertyDelegate` - Handles array parsing

### Design Patterns

- **State Machine**: Character-by-character parsing with delegates
- **Reactive Streams**: Event-based property value emission
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

## Usage (Planned API)

```typescript
import { JsonStreamParser } from 'llm_json_stream';

// Create parser with a readable stream
const parser = new JsonStreamParser(streamFromLLM);

// Subscribe to string properties with streaming
const titleStream = parser.getStringProperty('title');
titleStream.stream.on('data', (chunk) => {
  console.log('Title chunk:', chunk);
});

// Wait for complete values
const age = await parser.getNumberProperty('user.age').future;
console.log('Age:', age);

// React to array elements as they arrive
const items = parser.getListProperty('items');
items.onElement((element, index) => {
  console.log('Element', index, 'started parsing');
});

// Access nested properties with dot notation
const name = await parser.getStringProperty('user.profile.name').future;

// Clean up when done
await parser.dispose();
```

## Test Coverage

The package includes comprehensive test coverage matching the Dart version:

### Property Tests (6 files)
- String property parsing and streaming
- Number property parsing
- Boolean property parsing
- Null property parsing
- Map/Object property access
- List/Array property handling

### Integration Tests (10 files)
- Comprehensive demo with various chunk sizes
- Value retrieval across all types
- Error handling and edge cases
- Disposal and resource cleanup
- Buffer flushing behavior
- Multiline JSON handling
- Stream completion
- Critical bug regression tests
- Nested list debugging
- Bug diagnosis scenarios

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

## Implementation Status

- ✅ Project structure created
- ✅ All class boilerplates created
- ✅ All test files scaffolded
- ⏳ Implementation in progress
- ⏳ Logic and algorithms pending
- ⏳ Test implementations pending

## Credits

This is a TypeScript port of the [Dart llm_json_stream package](https://pub.dev/packages/llm_json_stream).
