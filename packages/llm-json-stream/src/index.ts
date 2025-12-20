/**
 * LLM JSON Stream - A streaming JSON parser for TypeScript
 *
 * A streaming JSON parser optimized for LLM responses.
 *
 * This library provides a JsonStream that allows you to parse JSON
 * data as it streams in, character by character. It's specifically designed
 * for handling Large Language Model (LLM) streaming responses that output
 * structured JSON data.
 *
 * ## Features
 *
 * - **Reactive property access**: Subscribe to JSON properties as they complete
 * - **Path-based subscriptions**: Access nested properties with dot notation
 * - **Chainable API**: Fluent syntax for accessing nested structures
 * - **Type safety**: Full TypeScript support with schema inference
 * - **Array support**: Access array elements by index and iterate dynamically
 *
 * ## Usage
 *
 * ```typescript
 * import { JsonStream } from 'llm-json-stream';
 *
 * interface User {
 *   name: string;
 *   age: number;
 * }
 *
 * const stream = JsonStream.parse<User>(streamFromLLM);
 *
 * // Using .get<T>(path) - manual path access
 * const name = await stream.get<string>('name');
 * console.log('Name:', name);
 *
 * // Streaming chunks
 * for await (const chunk of stream.get<string>('name')) {
 *   console.log('Name chunk:', chunk);
 * }
 *
 * // Using .paths() - ergonomic property access with TypeScript autocomplete
 * const paths = stream.paths();
 * const age = await paths.age;
 * console.log('Age:', age);
 * ```
 */

// Main API
export { JsonStream } from "./classes/json_stream.js";
export type {
    AsyncJson,
    AsyncJsonArrayPath,
    AsyncJsonIteratorYield,
    AsyncJsonObjectPath,
    AsyncJsonPath,
    AsyncJsonPrimitivePath,
    JsonStreamOptions,
} from "./classes/json_stream.js";

// Utilities (for testing and advanced usage)
export { streamTextInChunks } from "./utilities/stream_text_in_chunks.js";
export type { StreamTextOptions } from "./utilities/stream_text_in_chunks.js";
