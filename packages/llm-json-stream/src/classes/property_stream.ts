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
export function createAsyncIterator<T>(): {
    iterator: AsyncIterableIterator<T>;
    controller: AsyncIteratorController<T>;
} {
    const queue: T[] = [];
    let resolve: ((value: IteratorResult<T>) => void) | null = null;
    let isDone = false;
    let error: Error | null = null;

    const iterator: AsyncIterableIterator<T> = {
        [Symbol.asyncIterator]() {
            return this;
        },
        async next(): Promise<IteratorResult<T>> {
            // If there's an error, throw it
            if (error) {
                throw error;
            }

            // If there are queued values, return the next one
            if (queue.length > 0) {
                return { value: queue.shift()!, done: false };
            }

            // If done and queue is empty, signal completion
            if (isDone) {
                return { value: undefined as any, done: true };
            }

            // Wait for a value to be pushed
            return new Promise<IteratorResult<T>>((res) => {
                resolve = res;
            });
        },
    };

    const controller: AsyncIteratorController<T> = {
        push(value: T) {
            if (isDone) return;

            if (resolve) {
                resolve({ value, done: false });
                resolve = null;
            } else {
                queue.push(value);
            }
        },
        complete() {
            isDone = true;
            if (resolve) {
                resolve({ value: undefined as any, done: true });
                resolve = null;
            }
        },
        error(err: Error) {
            error = err;
            isDone = true;
            if (resolve) {
                // For errors, we need to reject the promise
                // We do this by creating a rejected result
                resolve({ value: undefined as any, done: true });
                resolve = null;
            }
        },
    };

    return { iterator, controller };
}

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
 *
 * PropertyStream is also thenable, so you can directly await it:
 * ```typescript
 * const value = await propertyStream;
 * ```
 */
export class PropertyStream<T> implements AsyncIterable<T>, PromiseLike<T> {
    protected _promise: Promise<T>;
    protected parserController: JsonStreamParserController;
    protected _iteratorController: AsyncIteratorController<T>;
    protected _iterator: AsyncIterableIterator<T>;

    // Buffered values for late subscribers
    protected _buffer: T[] = [];
    protected _isComplete = false;

    constructor(
        promise: Promise<T>,
        parserController: JsonStreamParserController,
        iteratorController?: AsyncIteratorController<T>,
        iterator?: AsyncIterableIterator<T>,
    ) {
        this._promise = promise;
        this.parserController = parserController;

        if (iteratorController && iterator) {
            this._iteratorController = iteratorController;
            this._iterator = iterator;
        } else {
            // Create default iterator
            const { iterator: iter, controller } = createAsyncIterator<T>();
            this._iterator = iter;
            this._iteratorController = controller;
        }
    }

    /**
     * A promise that resolves with the final parsed value of this property.
     * Use this when you need the complete value and don't need to react to partial chunks.
     *
     * @deprecated Use `await propertyStream` directly instead of `await propertyStream.promise`
     */
    get promise(): Promise<T> {
        return this._promise;
    }

    /**
     * Makes PropertyStream thenable, allowing direct await usage.
     *
     * @example
     * ```typescript
     * const value = await propertyStream;
     * ```
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> {
        return this._promise.then(onfulfilled, onrejected);
    }

    /**
     * Attaches a callback for only the rejection of the Promise.
     */
    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
    ): Promise<T | TResult> {
        return this._promise.catch(onrejected);
    }

    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
     */
    finally(onfinally?: (() => void) | null): Promise<T> {
        return this._promise.finally(onfinally);
    }

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
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
        return this._createBufferedIterator();
    }

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
    unbuffered(): AsyncIterableIterator<T> {
        return this._createUnbufferedIterator();
    }

    /**
     * Internal method to push a value to the stream.
     * Called by property stream controllers.
     */
    _pushValue(value: T): void {
        this._buffer.push(value);
        this._iteratorController.push(value);
    }

    /**
     * Internal method to signal stream completion.
     * Called by property stream controllers.
     */
    _complete(): void {
        this._isComplete = true;
        this._iteratorController.complete();
    }

    /**
     * Internal method to signal an error.
     * Called by property stream controllers.
     */
    _error(err: Error): void {
        this._isComplete = true;
        this._iteratorController.error(err);
    }

    /**
     * Creates a buffered iterator that replays all previous values.
     */
    private _createBufferedIterator(): AsyncIterableIterator<T> {
        let bufferIndex = 0;
        const self = this;

        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            async next(): Promise<IteratorResult<T>> {
                // First, replay buffered values
                if (bufferIndex < self._buffer.length) {
                    return { value: self._buffer[bufferIndex++]!, done: false };
                }

                // If complete and no more buffered values, we're done
                if (self._isComplete) {
                    return { value: undefined as any, done: true };
                }

                // Wait for new live values
                return new Promise<IteratorResult<T>>((resolve) => {
                    const checkBuffer = () => {
                        if (bufferIndex < self._buffer.length) {
                            resolve({
                                value: self._buffer[bufferIndex++]!,
                                done: false,
                            });
                            return true;
                        }
                        if (self._isComplete) {
                            resolve({ value: undefined as any, done: true });
                            return true;
                        }
                        return false;
                    };

                    // Check periodically for new values
                    const interval = setInterval(() => {
                        if (checkBuffer()) {
                            clearInterval(interval);
                        }
                    }, 1);

                    // Also check immediately
                    if (checkBuffer()) {
                        clearInterval(interval);
                    }
                });
            },
        };
    }

    /**
     * Creates an unbuffered iterator that only receives new values.
     */
    private _createUnbufferedIterator(): AsyncIterableIterator<T> {
        const self = this;
        let lastCheckedIndex = this._buffer.length; // Start from current position

        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            async next(): Promise<IteratorResult<T>> {
                // Check for new values since subscription
                if (
                    self._isComplete && lastCheckedIndex >= self._buffer.length
                ) {
                    return { value: undefined as any, done: true };
                }

                if (lastCheckedIndex < self._buffer.length) {
                    return {
                        value: self._buffer[lastCheckedIndex++]!,
                        done: false,
                    };
                }

                // Wait for next value
                return new Promise<IteratorResult<T>>((resolve) => {
                    const checkForNew = () => {
                        if (self._buffer.length > lastCheckedIndex) {
                            const newValue = self._buffer[lastCheckedIndex++]!;
                            resolve({ value: newValue, done: false });
                            return true;
                        }
                        if (self._isComplete) {
                            resolve({ value: undefined as any, done: true });
                            return true;
                        }
                        return false;
                    };

                    const interval = setInterval(() => {
                        if (checkForNew()) {
                            clearInterval(interval);
                        }
                    }, 1);

                    if (checkForNew()) {
                        clearInterval(interval);
                    }
                });
            },
        };
    }
}

/**
 * A property stream specifically for string values.
 * Strings emit chunks as they are parsed, allowing progressive display.
 */
export class StringPropertyStream extends PropertyStream<string> {
    constructor(
        promise: Promise<string>,
        parserController: JsonStreamParserController,
        iteratorController?: AsyncIteratorController<string>,
        iterator?: AsyncIterableIterator<string>,
    ) {
        super(promise, parserController, iteratorController, iterator);
    }
}

/**
 * A property stream for JSON object values.
 * Provides onProperty callback for reacting to properties as they start parsing.
 *
 * IMPORTANT: Property notifications are buffered so that late subscribers
 * can replay all previously notified properties. This ensures no properties
 * are missed when iterating, regardless of timing.
 */
export class ObjectPropertyStream extends PropertyStream<Record<string, any>> {
    private propertyPath: string;
    private _onPropertyCallbacks: Array<
        (property: PropertyStream<any>, key: string) => void
    > = [];

    /** Buffer of all property notifications for late subscribers */
    private _propertyBuffer: Array<
        { property: PropertyStream<any>; key: string }
    > = [];

    constructor(
        promise: Promise<Record<string, any>>,
        parserController: JsonStreamParserController,
        propertyPath: string,
        iteratorController?: AsyncIteratorController<Record<string, any>>,
        iterator?: AsyncIterableIterator<Record<string, any>>,
    ) {
        super(promise, parserController, iteratorController, iterator);
        this.propertyPath = propertyPath;
    }

    /**
     * Registers a callback that fires when each property in the object starts parsing.
     * The callback receives the property stream for the value and the property key.
     *
     * IMPORTANT: Late subscribers will receive notifications for ALL previously
     * discovered properties immediately upon registration, then receive new
     * properties as they are discovered.
     *
     * @example
     * ```typescript
     * const objectStream = parser.getObjectProperty('user');
     * objectStream.onProperty((property, key) => {
     *   console.log(`Property ${key} discovered`);
     *   if (property instanceof StringPropertyStream) {
     *     for await (const chunk of property) {
     *       console.log(`${key} chunk: ${chunk}`);
     *     }
     *   }
     * });
     * ```
     */
    onProperty(
        callback: (property: PropertyStream<any>, key: string) => void,
    ): void {
        // First, replay all buffered property notifications to this callback
        for (const { property, key } of this._propertyBuffer) {
            callback(property, key);
        }
        // Then add the callback for future notifications
        this._onPropertyCallbacks.push(callback);
    }

    /**
     * Internal method to notify callbacks about a new property.
     * Also buffers the notification for late subscribers.
     */
    _notifyProperty(property: PropertyStream<any>, key: string): void {
        // Buffer this notification for late subscribers
        this._propertyBuffer.push({ property, key });

        // Notify all currently registered callbacks
        for (const callback of this._onPropertyCallbacks) {
            callback(property, key);
        }
    }
}

/**
 * A property stream for JSON array values.
 * Provides onElement callback for reacting to elements as they start parsing.
 *
 * IMPORTANT: Element notifications are buffered so that late subscribers
 * can replay all previously notified elements. This ensures no elements
 * are missed when iterating, regardless of timing.
 */
export class ArrayPropertyStream<T = any> extends PropertyStream<T[]> {
    private propertyPath: string;
    private _onElementCallbacks: Array<
        (propertyStream: PropertyStream<any>, index: number) => void
    > = [];

    /** Buffer of all element notifications for late subscribers */
    private _elementBuffer: Array<
        { propertyStream: PropertyStream<any>; index: number }
    > = [];

    constructor(
        promise: Promise<T[]>,
        parserController: JsonStreamParserController,
        propertyPath: string,
        iteratorController?: AsyncIteratorController<T[]>,
        iterator?: AsyncIterableIterator<T[]>,
    ) {
        super(promise, parserController, iteratorController, iterator);
        this.propertyPath = propertyPath;
    }

    /**
     * Registers a callback that fires when each array element starts parsing.
     * The callback receives the property stream for the value and the property key.
     *
     * IMPORTANT: Late subscribers will receive notifications for ALL previously
     * discovered elements immediately upon registration, then receive new
     * elements as they are discovered.
     *
     * @example
     * ```typescript
     * const arrayStream = parser.getArrayProperty('items');
     * arrayStream.onElement((element, index) => {
     *   console.log(`Element ${index} discovered`);
     *   for await (const snapshot of element) {
     *     console.log(`Element ${index}: ${snapshot}`);
     *   }
     * });
     * ```
     */
    onElement(
        callback: (propertyStream: PropertyStream<any>, index: number) => void,
    ): void {
        // First, replay all buffered element notifications to this callback
        for (const { propertyStream, index } of this._elementBuffer) {
            callback(propertyStream, index);
        }
        // Then add the callback for future notifications
        this._onElementCallbacks.push(callback);
    }

    /**
     * Internal method to notify callbacks about a new element.
     * Also buffers the notification for late subscribers.
     */
    _notifyElement(propertyStream: PropertyStream<any>, index: number): void {
        // Buffer this notification for late subscribers
        this._elementBuffer.push({ propertyStream, index });

        // Notify all currently registered callbacks
        for (const callback of this._onElementCallbacks) {
            callback(propertyStream, index);
        }
    }
}

/**
 * A property stream for number values.
 * Numbers emit once when the complete value is parsed.
 */
export class NumberPropertyStream extends PropertyStream<number> {
    constructor(
        promise: Promise<number>,
        parserController: JsonStreamParserController,
        iteratorController?: AsyncIteratorController<number>,
        iterator?: AsyncIterableIterator<number>,
    ) {
        super(promise, parserController, iteratorController, iterator);
    }
}

/**
 * A property stream for boolean values.
 * Booleans emit once when the complete value is parsed.
 */
export class BooleanPropertyStream extends PropertyStream<boolean> {
    constructor(
        promise: Promise<boolean>,
        parserController: JsonStreamParserController,
        iteratorController?: AsyncIteratorController<boolean>,
        iterator?: AsyncIterableIterator<boolean>,
    ) {
        super(promise, parserController, iteratorController, iterator);
    }
}

/**
 * A property stream for null values.
 * Null emits once when parsed.
 */
export class NullPropertyStream extends PropertyStream<null> {
    constructor(
        promise: Promise<null>,
        parserController: JsonStreamParserController,
        iteratorController?: AsyncIteratorController<null>,
        iterator?: AsyncIterableIterator<null>,
    ) {
        super(promise, parserController, iteratorController, iterator);
    }
}
