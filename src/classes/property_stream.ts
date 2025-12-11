/**
 * Property stream classes providing reactive access to JSON values.
 * These are the public API classes that users interact with.
 */

import { EventEmitter } from "events";
import { JsonStreamParserController } from "./json_stream_parser.js";

/**
 * Base class for all property streams.
 * Property streams provide access to JSON values as they are parsed from the input stream.
 */
export class PropertyStream<T> {
    protected _promise: Promise<T>;
    protected parserController: JsonStreamParserController;
    protected _stream?: EventEmitter;

    constructor(
        promise: Promise<T>,
        parserController: JsonStreamParserController,
        stream?: EventEmitter,
    ) {
        this._promise = promise;
        this.parserController = parserController;
        this._stream = stream;
    }

    /**
     * A promise that resolves with the final parsed value of this property.
     * Use this when you need the complete value and don't need to react to partial chunks.
     */
    get promise(): Promise<T> {
        return this._promise;
    }

    /**
     * An event emitter that emits 'data' events with value chunks as they are parsed.
     * Returns undefined for types that don't support streaming (like arrays and objects).
     */
    get stream(): EventEmitter | undefined {
        return this._stream;
    }

    /**
     * Implements the async iterator protocol, allowing consumption of the stream
     * using modern `for await...of` syntax.
     *
     * @example
     * ```typescript
     * const nameStream = parser.getStringProperty("name");
     * for await (const chunk of nameStream) {
     *   console.log(chunk);
     * }
     * ```
     */
    async *[Symbol.asyncIterator](): AsyncIterableIterator<string> {
        if (!this._stream) {
            // For non-streaming types, just yield the final value once
            const value = await this._promise;
            yield String(value);
            return;
        }

        // Create a queue to buffer chunks
        const chunks: string[] = [];
        let resolve: (() => void) | null = null;
        let isDone = false;
        let error: Error | null = null;

        const onData = (chunk: string) => {
            chunks.push(chunk);
            if (resolve) {
                resolve();
                resolve = null;
            }
        };

        const onEnd = () => {
            isDone = true;
            if (resolve) {
                resolve();
                resolve = null;
            }
        };

        const onError = (err: Error) => {
            error = err;
            isDone = true;
            if (resolve) {
                resolve();
                resolve = null;
            }
        };

        this._stream.on("data", onData);
        this._promise.then(onEnd).catch(onError);

        try {
            while (!isDone || chunks.length > 0) {
                if (chunks.length > 0) {
                    yield chunks.shift()!;
                } else if (!isDone) {
                    // Wait for more data
                    await new Promise<void>((res) => {
                        resolve = res;
                    });

                    if (error) {
                        throw error;
                    }
                }
            }
        } finally {
            // Clean up listeners
            this._stream.removeListener("data", onData);
        }
    }
}

/**
 * A property stream for JSON object/map values.
 */
export class MapPropertyStream extends PropertyStream<Record<string, any>> {
    private propertyPath: string;

    constructor(
        promise: Promise<Record<string, any>>,
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(promise, parserController);
        this.propertyPath = propertyPath;
    }

    // TODO: Add chainable property getters
}

/**
 * A property stream for JSON array values.
 * Provides onElement callback for reacting to elements as they start parsing.
 */
export class ListPropertyStream<T extends object> extends PropertyStream<T[]> {
    private propertyPath: string;

    constructor(
        promise: Promise<T[]>,
        parserController: JsonStreamParserController,
        propertyPath: string,
    ) {
        super(promise, parserController);
        this.propertyPath = propertyPath;
    }

    /**
     * Registers a callback that fires when each array element starts parsing.
     * The callback receives the property stream for the new element and its index.
     */
    onElement(
        callback: (propertyStream: PropertyStream<any>, index: number) => void,
    ): void {
        // TODO: Implementation
    }
}
