/**
 * LLM JSON Stream - A streaming JSON parser for TypeScript
 *
 * A streaming JSON parser optimized for LLM responses.
 *
 * This library provides a JsonStreamParser that allows you to parse JSON
 * data as it streams in, character by character. It's specifically designed
 * for handling Large Language Model (LLM) streaming responses that output
 * structured JSON data.
 *
 * ## Features
 *
 * - **Reactive property access**: Subscribe to JSON properties as they complete
 * - **Path-based subscriptions**: Access nested properties with dot notation
 * - **Chainable API**: Fluent syntax for accessing nested structures
 * - **Type safety**: Typed property streams for all JSON types
 * - **Array support**: Access array elements by index and iterate dynamically
 *
 * ## Usage
 *
 * ```typescript
 * import { JsonStreamParser } from 'llm_json_stream';
 *
 * const parser = new JsonStreamParser(streamFromLLM);
 *
 * // Modern async iterator pattern (recommended)
 * const nameStream = parser.getStringProperty('user.name');
 * for await (const chunk of nameStream) {
 *   console.log('Name chunk:', chunk);
 * }
 *
 * // Wait for complete values
 * const age = await parser.getNumberProperty('user.age').promise;
 * console.log('Age:', age);
 * ```
 */
// Core parser
export { JsonStreamParser, JsonStreamParserController, } from "./classes/json_stream_parser.js";
// Property streams (public API)
export { BooleanPropertyStream, ListPropertyStream, MapPropertyStream, NullPropertyStream, NumberPropertyStream, PropertyStream, StringPropertyStream, } from "./classes/property_stream.js";
export { createAsyncIterator } from "./classes/property_stream.js";
// Utilities (for testing and advanced usage)
export { streamTextInChunks } from "./utilities/stream_text_in_chunks.js";
//# sourceMappingURL=index.js.map