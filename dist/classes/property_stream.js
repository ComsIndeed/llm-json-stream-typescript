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
 * Creates an async iterator with a controller for pushing values.
 * This is the foundation for all streaming in the library.
 */
export function createAsyncIterator() {
    const queue = [];
    let resolve = null;
    let isDone = false;
    let error = null;
    const iterator = {
        [Symbol.asyncIterator]() {
            return this;
        },
        async next() {
            // If there's an error, throw it
            if (error) {
                throw error;
            }
            // If there are queued values, return the next one
            if (queue.length > 0) {
                return { value: queue.shift(), done: false };
            }
            // If done and queue is empty, signal completion
            if (isDone) {
                return { value: undefined, done: true };
            }
            // Wait for a value to be pushed
            return new Promise((res) => {
                resolve = res;
            });
        },
    };
    const controller = {
        push(value) {
            if (isDone)
                return;
            if (resolve) {
                resolve({ value, done: false });
                resolve = null;
            }
            else {
                queue.push(value);
            }
        },
        complete() {
            isDone = true;
            if (resolve) {
                resolve({ value: undefined, done: true });
                resolve = null;
            }
        },
        error(err) {
            error = err;
            isDone = true;
            if (resolve) {
                // For errors, we need to reject the promise
                // We do this by creating a rejected result
                resolve({ value: undefined, done: true });
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
 */
export class PropertyStream {
    _promise;
    parserController;
    _iteratorController;
    _iterator;
    // Buffered values for late subscribers
    _buffer = [];
    _isComplete = false;
    constructor(promise, parserController, iteratorController, iterator) {
        this._promise = promise;
        this.parserController = parserController;
        if (iteratorController && iterator) {
            this._iteratorController = iteratorController;
            this._iterator = iterator;
        }
        else {
            // Create default iterator
            const { iterator: iter, controller } = createAsyncIterator();
            this._iterator = iter;
            this._iteratorController = controller;
        }
    }
    /**
     * A promise that resolves with the final parsed value of this property.
     * Use this when you need the complete value and don't need to react to partial chunks.
     */
    get promise() {
        return this._promise;
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
    [Symbol.asyncIterator]() {
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
    unbuffered() {
        return this._createUnbufferedIterator();
    }
    /**
     * Internal method to push a value to the stream.
     * Called by property stream controllers.
     */
    _pushValue(value) {
        this._buffer.push(value);
        this._iteratorController.push(value);
    }
    /**
     * Internal method to signal stream completion.
     * Called by property stream controllers.
     */
    _complete() {
        this._isComplete = true;
        this._iteratorController.complete();
    }
    /**
     * Internal method to signal an error.
     * Called by property stream controllers.
     */
    _error(err) {
        this._isComplete = true;
        this._iteratorController.error(err);
    }
    /**
     * Creates a buffered iterator that replays all previous values.
     */
    _createBufferedIterator() {
        let bufferIndex = 0;
        const self = this;
        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            async next() {
                // First, replay buffered values
                if (bufferIndex < self._buffer.length) {
                    return { value: self._buffer[bufferIndex++], done: false };
                }
                // If complete and no more buffered values, we're done
                if (self._isComplete) {
                    return { value: undefined, done: true };
                }
                // Wait for new live values
                return new Promise((resolve) => {
                    const checkBuffer = () => {
                        if (bufferIndex < self._buffer.length) {
                            resolve({
                                value: self._buffer[bufferIndex++],
                                done: false,
                            });
                            return true;
                        }
                        if (self._isComplete) {
                            resolve({ value: undefined, done: true });
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
    _createUnbufferedIterator() {
        const self = this;
        let lastCheckedIndex = this._buffer.length; // Start from current position
        return {
            [Symbol.asyncIterator]() {
                return this;
            },
            async next() {
                // Check for new values since subscription
                if (self._isComplete && lastCheckedIndex >= self._buffer.length) {
                    return { value: undefined, done: true };
                }
                if (lastCheckedIndex < self._buffer.length) {
                    return {
                        value: self._buffer[lastCheckedIndex++],
                        done: false,
                    };
                }
                // Wait for next value
                return new Promise((resolve) => {
                    const checkForNew = () => {
                        if (self._buffer.length > lastCheckedIndex) {
                            const newValue = self._buffer[lastCheckedIndex++];
                            resolve({ value: newValue, done: false });
                            return true;
                        }
                        if (self._isComplete) {
                            resolve({ value: undefined, done: true });
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
export class StringPropertyStream extends PropertyStream {
    constructor(promise, parserController, iteratorController, iterator) {
        super(promise, parserController, iteratorController, iterator);
    }
}
/**
 * A property stream for JSON object values.
 * Provides onProperty callback for reacting to properties as they start parsing.
 */
export class ObjectPropertyStream extends PropertyStream {
    propertyPath;
    _onPropertyCallbacks = [];
    constructor(promise, parserController, propertyPath, iteratorController, iterator) {
        super(promise, parserController, iteratorController, iterator);
        this.propertyPath = propertyPath;
    }
    /**
     * Registers a callback that fires when each property in the object starts parsing.
     * The callback receives the property stream for the value and the property key.
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
    onProperty(callback) {
        this._onPropertyCallbacks.push(callback);
    }
    /**
     * Internal method to notify callbacks about a new property.
     */
    _notifyProperty(property, key) {
        for (const callback of this._onPropertyCallbacks) {
            callback(property, key);
        }
    }
}
/**
 * A property stream for JSON array values.
 * Provides onElement callback for reacting to elements as they start parsing.
 */
export class ArrayPropertyStream extends PropertyStream {
    propertyPath;
    _onElementCallbacks = [];
    constructor(promise, parserController, propertyPath, iteratorController, iterator) {
        super(promise, parserController, iteratorController, iterator);
        this.propertyPath = propertyPath;
    }
    /**
     * Registers a callback that fires when each array element starts parsing.
     * The callback receives the property stream for the new element and its index.
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
    onElement(callback) {
        this._onElementCallbacks.push(callback);
    }
    /**
     * Internal method to notify callbacks about a new element.
     */
    _notifyElement(propertyStream, index) {
        for (const callback of this._onElementCallbacks) {
            callback(propertyStream, index);
        }
    }
}
/**
 * A property stream for number values.
 * Numbers emit once when the complete value is parsed.
 */
export class NumberPropertyStream extends PropertyStream {
    constructor(promise, parserController, iteratorController, iterator) {
        super(promise, parserController, iteratorController, iterator);
    }
}
/**
 * A property stream for boolean values.
 * Booleans emit once when the complete value is parsed.
 */
export class BooleanPropertyStream extends PropertyStream {
    constructor(promise, parserController, iteratorController, iterator) {
        super(promise, parserController, iteratorController, iterator);
    }
}
/**
 * A property stream for null values.
 * Null emits once when parsed.
 */
export class NullPropertyStream extends PropertyStream {
    constructor(promise, parserController, iteratorController, iterator) {
        super(promise, parserController, iteratorController, iterator);
    }
}
//# sourceMappingURL=property_stream.js.map