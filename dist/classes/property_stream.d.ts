/**
 * Property stream classes providing reactive access to JSON values.
 * These are the public API classes that users interact with.
 *
 * Uses native async iterators as the primary streaming interface,
 * providing a modern, cross-platform approach that works in Node.js,
 * Deno, Bun, and browsers.
 */
import { JsonStreamParserController } from "./json_stream_parser.js";
/**
 * Internal interface for pushing values to the async iterator.
 * This is used by the stream controllers to emit values.
 */
export interface AsyncIteratorController<T> {
    push(value: T): void;
    complete(): void;
    error(err: Error): void;
}
/**
 * Creates an async iterator with a controller for pushing values.
 * This is the foundation for all streaming in the library.
 */
export declare function createAsyncIterator<T>(): {
    iterator: AsyncIterableIterator<T>;
    controller: AsyncIteratorController<T>;
};
/**
 * Base class for all property streams.
 * Property streams provide access to JSON values as they are parsed from the input stream.
 *
 * The primary interface is async iteration:
 * ```typescript
 * for await (const chunk of propertyStream) {
 *   console.log(chunk);
 * }
 * ```
 */
export declare class PropertyStream<T> implements AsyncIterable<T> {
    protected _promise: Promise<T>;
    protected parserController: JsonStreamParserController;
    protected _iteratorController: AsyncIteratorController<T>;
    protected _iterator: AsyncIterableIterator<T>;
    protected _buffer: T[];
    protected _isComplete: boolean;
    constructor(promise: Promise<T>, parserController: JsonStreamParserController, iteratorController?: AsyncIteratorController<T>, iterator?: AsyncIterableIterator<T>);
    /**
     * A promise that resolves with the final parsed value of this property.
     * Use this when you need the complete value and don't need to react to partial chunks.
     */
    get promise(): Promise<T>;
    /**
     * Implements the async iterable protocol, allowing consumption of the stream
     * using modern `for await...of` syntax.
     *
     * This is the BUFFERED stream - late subscribers will receive all previous values.
     *
     * @example
     * ```typescript
     * const nameStream = parser.getStringProperty("name");
     * for await (const chunk of nameStream) {
     *   console.log(chunk);
     * }
     * ```
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<T>;
    /**
     * Returns an unbuffered async iterator.
     * Late subscribers will NOT receive previous values - only new values from subscription point.
     *
     * @example
     * ```typescript
     * const nameStream = parser.getStringProperty("name");
     * for await (const chunk of nameStream.unbuffered()) {
     *   console.log(chunk); // Only new chunks from this point
     * }
     * ```
     */
    unbuffered(): AsyncIterableIterator<T>;
    /**
     * Internal method to push a value to the stream.
     * Called by property stream controllers.
     */
    _pushValue(value: T): void;
    /**
     * Internal method to signal stream completion.
     * Called by property stream controllers.
     */
    _complete(): void;
    /**
     * Internal method to signal an error.
     * Called by property stream controllers.
     */
    _error(err: Error): void;
    /**
     * Creates a buffered iterator that replays all previous values.
     */
    private _createBufferedIterator;
    /**
     * Creates an unbuffered iterator that only receives new values.
     */
    private _createUnbufferedIterator;
}
/**
 * A property stream specifically for string values.
 * Strings emit chunks as they are parsed, allowing progressive display.
 */
export declare class StringPropertyStream extends PropertyStream<string> {
    constructor(promise: Promise<string>, parserController: JsonStreamParserController, iteratorController?: AsyncIteratorController<string>, iterator?: AsyncIterableIterator<string>);
}
/**
 * A property stream for JSON object/map values.
 * Provides onProperty callback for reacting to properties as they start parsing.
 */
export declare class MapPropertyStream extends PropertyStream<Record<string, any>> {
    private propertyPath;
    private _onPropertyCallbacks;
    constructor(promise: Promise<Record<string, any>>, parserController: JsonStreamParserController, propertyPath: string, iteratorController?: AsyncIteratorController<Record<string, any>>, iterator?: AsyncIterableIterator<Record<string, any>>);
    /**
     * Registers a callback that fires when each property in the map starts parsing.
     * The callback receives the property stream for the value and the property key.
     *
     * @example
     * ```typescript
     * const mapStream = parser.getMapProperty('user');
     * mapStream.onProperty((property, key) => {
     *   console.log(`Property ${key} discovered`);
     *   if (property instanceof StringPropertyStream) {
     *     for await (const chunk of property) {
     *       console.log(`${key} chunk: ${chunk}`);
     *     }
     *   }
     * });
     * ```
     */
    onProperty(callback: (property: PropertyStream<any>, key: string) => void): void;
    /**
     * Internal method to notify callbacks about a new property.
     */
    _notifyProperty(property: PropertyStream<any>, key: string): void;
}
/**
 * A property stream for JSON array values.
 * Provides onElement callback for reacting to elements as they start parsing.
 */
export declare class ListPropertyStream<T = any> extends PropertyStream<T[]> {
    private propertyPath;
    private _onElementCallbacks;
    constructor(promise: Promise<T[]>, parserController: JsonStreamParserController, propertyPath: string, iteratorController?: AsyncIteratorController<T[]>, iterator?: AsyncIterableIterator<T[]>);
    /**
     * Registers a callback that fires when each array element starts parsing.
     * The callback receives the property stream for the new element and its index.
     *
     * @example
     * ```typescript
     * const listStream = parser.getListProperty('items');
     * listStream.onElement((element, index) => {
     *   console.log(`Element ${index} discovered`);
     *   for await (const snapshot of element) {
     *     console.log(`Element ${index}: ${snapshot}`);
     *   }
     * });
     * ```
     */
    onElement(callback: (propertyStream: PropertyStream<any>, index: number) => void): void;
    /**
     * Internal method to notify callbacks about a new element.
     */
    _notifyElement(propertyStream: PropertyStream<any>, index: number): void;
}
/**
 * A property stream for number values.
 * Numbers emit once when the complete value is parsed.
 */
export declare class NumberPropertyStream extends PropertyStream<number> {
    constructor(promise: Promise<number>, parserController: JsonStreamParserController, iteratorController?: AsyncIteratorController<number>, iterator?: AsyncIterableIterator<number>);
}
/**
 * A property stream for boolean values.
 * Booleans emit once when the complete value is parsed.
 */
export declare class BooleanPropertyStream extends PropertyStream<boolean> {
    constructor(promise: Promise<boolean>, parserController: JsonStreamParserController, iteratorController?: AsyncIteratorController<boolean>, iterator?: AsyncIterableIterator<boolean>);
}
/**
 * A property stream for null values.
 * Null emits once when parsed.
 */
export declare class NullPropertyStream extends PropertyStream<null> {
    constructor(promise: Promise<null>, parserController: JsonStreamParserController, iteratorController?: AsyncIteratorController<null>, iterator?: AsyncIterableIterator<null>);
}
//# sourceMappingURL=property_stream.d.ts.map