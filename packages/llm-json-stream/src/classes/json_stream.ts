/**
 * JsonStream - The new unified API for streaming JSON parsing
 *
 * This module provides a modern, type-safe API for parsing streaming JSON data
 * from LLM responses.
 *
 * @example
 * ```typescript
 * interface User {
 *     name: string;
 *     age: number;
 * }
 *
 * const stream = JsonStream.parse<User>(llmResponse);
 *
 * // Using .get<T>(path) - manual path access
 * const name = await stream.get<string>('name');
 *
 * // Streaming chunks
 * for await (const chunk of stream.get<string>('name')) {
 *     console.log(chunk);
 * }
 *
 * // Using .paths() - ergonomic property access
 * const paths = stream.paths();
 * const name = await paths.name;
 * ```
 */

import { JsonStreamParser } from "./json_stream_parser.js";
import { PropertyStream } from "./property_stream.js";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for creating a JsonStream.
 */
export interface JsonStreamOptions {
    /**
     * Whether to stop consuming the stream when the root JSON element completes.
     * Default: true
     */
    closeOnRootComplete?: boolean;
}

/**
 * AsyncJson<T> - A unified type that is both a Promise and an AsyncIterable.
 *
 * This is the core type returned by .get<T>(path). It allows:
 * - Awaiting the final value: `const name = await asyncJson;`
 * - Iterating over streaming chunks: `for await (const chunk of asyncJson) { ... }`
 * - Chained property access: `asyncJson.get<U>('nested.path')`
 */
export interface AsyncJson<T> extends Promise<T>, AsyncIterable<T> {
    /**
     * Get a nested property from this value.
     * @param path - The path to the nested property (supports dot notation and bracket notation)
     */
    get<U>(path: string): AsyncJson<U>;

    /**
     * Returns an unbuffered async iterator that only receives new values from the subscription point.
     */
    unbuffered(): AsyncIterableIterator<T>;
}

/**
 * Type helper for creating the proxy path type.
 * This allows for ergonomic property access like `paths.user.name`.
 *
 * The $ methods are used to escape from the proxy:
 * - `.$get<U>(path)` - Get a nested property with manual path
 * - `.$as<U>()` - Cast the current path to a different type
 * - `.$asAsyncJson()` - Convert to AsyncJson for full API access
 */
export type AsyncJsonPath<T> = T extends Array<infer E> ? AsyncJsonArrayPath<E>
    : T extends object ? AsyncJsonObjectPath<T>
    : AsyncJsonPrimitivePath<T>;

/**
 * Helper type for primitive paths (string, number, boolean, null).
 */
export type AsyncJsonPrimitivePath<T> = AsyncJson<T> & {
    /** Get a nested property with manual path */
    $get<U>(path: string): AsyncJson<U>;
    /** Cast to a different type */
    $as<U>(): AsyncJsonPath<U>;
    /** Convert to AsyncJson for full API access */
    $asAsyncJson(): AsyncJson<T>;
};

/**
 * Helper type for object paths.
 */
export type AsyncJsonObjectPath<T> =
    & {
        [K in keyof T]: AsyncJsonPath<T[K]>;
    }
    & AsyncJson<T>
    & {
        /** Get a nested property with manual path */
        $get<U>(path: string): AsyncJson<U>;
        /** Cast to a different type */
        $as<U>(): AsyncJsonPath<U>;
        /** Convert to AsyncJson for full API access */
        $asAsyncJson(): AsyncJson<T>;
    };

/**
 * Helper type for array paths.
 */
export type AsyncJsonArrayPath<E> =
    & {
        [index: number]: AsyncJsonPath<E>;
    }
    & AsyncJson<E[]>
    & {
        length: AsyncJson<number>;
        /** Get a nested property with manual path */
        $get<U>(path: string): AsyncJson<U>;
        /** Cast to a different type */
        $as<U>(): AsyncJsonPath<U>;
        /** Convert to AsyncJson for full API access */
        $asAsyncJson(): AsyncJson<E[]>;
    };

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates an AsyncJson wrapper around a PropertyStream.
 * This makes the PropertyStream both awaitable and iterable.
 */
function createAsyncJsonFromStream<T>(
    propertyStream: PropertyStream<T>,
    jsonStream: JsonStream<any>,
    basePath: string,
): AsyncJson<T> {
    // Create the base promise from the property stream
    const promise = propertyStream.promise;

    // Create the AsyncJson object that is both a Promise and AsyncIterable
    const asyncJson: AsyncJson<T> = {
        // Promise interface - delegates to the underlying promise
        then<TResult1 = T, TResult2 = never>(
            onfulfilled?:
                | ((value: T) => TResult1 | PromiseLike<TResult1>)
                | null,
            onrejected?:
                | ((reason: any) => TResult2 | PromiseLike<TResult2>)
                | null,
        ): Promise<TResult1 | TResult2> {
            return promise.then(onfulfilled, onrejected);
        },

        catch<TResult = never>(
            onrejected?:
                | ((reason: any) => TResult | PromiseLike<TResult>)
                | null,
        ): Promise<T | TResult> {
            return promise.catch(onrejected);
        },

        finally(onfinally?: (() => void) | null): Promise<T> {
            return promise.finally(onfinally);
        },

        // Symbol for Promise identification
        [Symbol.toStringTag]: "AsyncJson",

        // AsyncIterable interface - delegates to the property stream
        [Symbol.asyncIterator](): AsyncIterableIterator<T> {
            return propertyStream[Symbol.asyncIterator]();
        },

        // Chained property access
        get<U>(path: string): AsyncJson<U> {
            const fullPath = basePath ? `${basePath}.${path}` : path;
            return jsonStream.get<U>(fullPath);
        },

        // Unbuffered iterator access
        unbuffered(): AsyncIterableIterator<T> {
            return propertyStream.unbuffered();
        },
    };

    return asyncJson;
}

/**
 * Creates a proxy for ergonomic path-based property access.
 */
function createPathProxy<T>(
    jsonStream: JsonStream<any>,
    basePath: string = "",
): AsyncJsonPath<T> {
    // Lazily create the AsyncJson only when we actually need it (for await/iterate)
    let cachedAsyncJson: AsyncJson<T> | null = null;
    const getAsyncJson = () => {
        if (!cachedAsyncJson) {
            cachedAsyncJson = jsonStream.get<T>(basePath);
        }
        return cachedAsyncJson;
    };

    return new Proxy({} as any, {
        get(target, prop, receiver) {
            // Handle Promise protocol - critical for await to work
            // Only create the AsyncJson when we actually need to await
            if (prop === "then") {
                const asyncJson = getAsyncJson();
                return asyncJson.then.bind(asyncJson);
            }
            if (prop === "catch") {
                const asyncJson = getAsyncJson();
                return asyncJson.catch.bind(asyncJson);
            }
            if (prop === "finally") {
                const asyncJson = getAsyncJson();
                return asyncJson.finally.bind(asyncJson);
            }

            // Handle AsyncIterable protocol
            if (prop === Symbol.asyncIterator) {
                const asyncJson = getAsyncJson();
                return asyncJson[Symbol.asyncIterator].bind(asyncJson);
            }

            // Handle Symbol.toStringTag for proper promise identification
            if (prop === Symbol.toStringTag) {
                return "AsyncJsonPath";
            }

            // Handle toJSON to prevent infinite recursion in JSON.stringify
            if (prop === "toJSON") {
                return () => undefined;
            }

            // Handle util.inspect.custom for Node.js pretty printing
            if (prop === Symbol.for("nodejs.util.inspect.custom")) {
                return () => `[AsyncJsonPath: ${basePath || "root"}]`;
            }

            // Handle framework-specific symbols
            if (
                prop === "__esModule" ||
                prop === "$$typeof" ||
                prop === "_isVue" ||
                prop === "__v_isRef" ||
                prop === "constructor"
            ) {
                return undefined;
            }

            // Handle $get method - manual path access from current path
            if (prop === "$get") {
                return <U>(innerPath: string): AsyncJson<U> => {
                    const fullPath = basePath
                        ? `${basePath}.${innerPath}`
                        : innerPath;
                    return jsonStream.get<U>(fullPath);
                };
            }

            // Handle $as method - cast to a different type
            if (prop === "$as") {
                return <U>(): AsyncJsonPath<U> => {
                    return createPathProxy<U>(jsonStream, basePath);
                };
            }

            // Handle $asAsyncJson method - convert to AsyncJson
            if (prop === "$asAsyncJson") {
                return (): AsyncJson<T> => {
                    return getAsyncJson();
                };
            }

            // Handle get method (for AsyncJson compatibility)
            if (prop === "get") {
                const asyncJson = getAsyncJson();
                return asyncJson.get.bind(asyncJson);
            }

            // Handle unbuffered method
            if (prop === "unbuffered") {
                const asyncJson = getAsyncJson();
                return asyncJson.unbuffered.bind(asyncJson);
            }

            // Handle numeric indices (array access)
            if (typeof prop === "string" && /^\d+$/.test(prop)) {
                const index = parseInt(prop, 10);
                const newPath = basePath
                    ? `${basePath}[${index}]`
                    : `[${index}]`;
                return createPathProxy(jsonStream, newPath);
            }

            // Handle string property access - create a new proxy with extended path
            if (typeof prop === "string") {
                const newPath = basePath ? `${basePath}.${prop}` : prop;
                return createPathProxy(jsonStream, newPath);
            }

            // Default: access on the target
            return Reflect.get(target, prop, receiver);
        },
    }) as AsyncJsonPath<T>;
}

// ============================================================================
// JsonStream Class
// ============================================================================

/**
 * Pending property request that waits for the parser to create the stream
 */
interface PendingPropertyRequest<T> {
    resolve: (stream: PropertyStream<T>) => void;
    reject: (error: Error) => void;
}

/**
 * JsonStream<T> - The main parser object for streaming JSON parsing.
 *
 * @example
 * ```typescript
 * interface Response {
 *     message: string;
 *     data: { items: string[] };
 * }
 *
 * const stream = JsonStream.parse<Response>(llmResponse);
 *
 * // Get a property
 * const message = await stream.get<string>('message');
 *
 * // Stream chunks
 * for await (const chunk of stream.get<string>('message')) {
 *     console.log(chunk);
 * }
 *
 * // Use ergonomic paths
 * const paths = stream.paths();
 * const firstItem = await paths.data.items[0];
 * ```
 */
export class JsonStream<T = any> {
    private parser: JsonStreamParser;
    private pendingRequests: Map<string, PendingPropertyRequest<any>[]> =
        new Map();
    private disposed = false;

    private constructor(
        stream: AsyncIterable<string>,
        options?: JsonStreamOptions,
    ) {
        this.parser = new JsonStreamParser(stream, options);

        // Hook into the parser to intercept property stream creation
        this.setupPropertyInterception();
    }

    /**
     * Creates a new JsonStream from an async iterable stream.
     *
     * @param stream - The async iterable stream of JSON text
     * @param options - Optional configuration options
     * @returns A new JsonStream instance
     */
    static parse<T = any>(
        stream: AsyncIterable<string>,
        options?: JsonStreamOptions,
    ): JsonStream<T> {
        return new JsonStream<T>(stream, options);
    }

    /**
     * Gets a property at the specified path.
     *
     * @param path - The path to the property (supports dot notation and bracket notation)
     * @returns An AsyncJson that can be awaited or iterated
     */
    get<U>(path: string): AsyncJson<U> {
        this.checkDisposed();

        // The path is used directly - the parser expects bracket notation for arrays
        // e.g., "users[0].name" not "users.0.name"

        // Check if we already have a controller for this path
        const existingController = (this.parser as any).propertyControllers
            ?.get(path);
        if (existingController) {
            return createAsyncJsonFromStream<U>(
                existingController.propertyStream,
                this,
                path,
            );
        }

        // Create a pending request that will be resolved when the parser creates the stream
        return this.createPendingAsyncJson<U>(path);
    }

    /**
     * Returns a proxy object for ergonomic property access.
     *
     * @returns An AsyncJsonPath proxy for the root object
     */
    paths(): AsyncJsonPath<T> {
        this.checkDisposed();
        return createPathProxy<T>(this, "");
    }

    /**
     * Disposes the parser and cleans up resources.
     */
    async dispose(): Promise<void> {
        if (this.disposed) return;
        this.disposed = true;

        // Reject all pending requests
        const error = new Error("JsonStream disposed");
        for (const requests of this.pendingRequests.values()) {
            for (const request of requests) {
                request.reject(error);
            }
        }
        this.pendingRequests.clear();

        await this.parser.dispose();
    }

    private checkDisposed(): void {
        if (this.disposed) {
            throw new Error("JsonStream has been disposed");
        }
    }

    /**
     * Creates an AsyncJson for a path that doesn't have a stream yet.
     *
     * IMPORTANT: We wrap PropertyStream in a container object to avoid JavaScript's
     * automatic thenable unwrapping. When a Promise resolves with a thenable (like
     * PropertyStream), it automatically adopts the thenable's state instead of
     * resolving with the thenable itself. By wrapping in { stream }, we ensure
     * we get the PropertyStream object.
     */
    private createPendingAsyncJson<U>(path: string): AsyncJson<U> {
        // Create deferred promise - wrap in container to avoid thenable unwrapping
        let resolveStream: (wrapped: { stream: PropertyStream<U> }) => void;
        let rejectStream: (error: Error) => void;
        const streamPromise = new Promise<{ stream: PropertyStream<U> }>(
            (resolve, reject) => {
                resolveStream = resolve;
                rejectStream = reject;
            },
        );

        // Register the pending request - resolver unwraps before resolving
        let requests = this.pendingRequests.get(path);
        if (!requests) {
            requests = [];
            this.pendingRequests.set(path, requests);
        }
        // Register the pending request - wrap stream to avoid thenable unwrapping
        requests.push({
            resolve: (stream: PropertyStream<U>) => resolveStream!({ stream }),
            reject: rejectStream!,
        });

        // Create the promise that resolves to the final value
        const valuePromise = streamPromise.then(({ stream }) => stream.promise);

        // Create async iterator that will be bound when stream is available
        const self = this;

        const asyncJson: AsyncJson<U> = {
            then<TResult1 = U, TResult2 = never>(
                onfulfilled?:
                    | ((value: U) => TResult1 | PromiseLike<TResult1>)
                    | null,
                onrejected?:
                    | ((reason: any) => TResult2 | PromiseLike<TResult2>)
                    | null,
            ): Promise<TResult1 | TResult2> {
                return valuePromise.then(onfulfilled, onrejected);
            },

            catch<TResult = never>(
                onrejected?:
                    | ((reason: any) => TResult | PromiseLike<TResult>)
                    | null,
            ): Promise<U | TResult> {
                return valuePromise.catch(onrejected);
            },

            finally(onfinally?: (() => void) | null): Promise<U> {
                return valuePromise.finally(onfinally);
            },

            [Symbol.toStringTag]: "AsyncJson",

            [Symbol.asyncIterator](): AsyncIterableIterator<U> {
                // Create an iterator that waits for the stream to be ready
                let propertyStream: PropertyStream<U> | null = null;
                let streamIterator: AsyncIterableIterator<U> | null = null;

                const iter: AsyncIterableIterator<U> = {
                    [Symbol.asyncIterator]() {
                        return this;
                    },
                    async next(): Promise<IteratorResult<U>> {
                        // Wait for the stream to be available
                        if (!propertyStream) {
                            // Unwrap from container
                            const { stream } = await streamPromise;
                            propertyStream = stream;
                        }

                        // Get or create the iterator
                        if (!streamIterator) {
                            streamIterator = propertyStream!
                                [Symbol.asyncIterator]();
                        }

                        return streamIterator.next();
                    },
                };

                return iter;
            },

            get<V>(innerPath: string): AsyncJson<V> {
                const fullPath = path ? `${path}.${innerPath}` : innerPath;
                return self.get<V>(fullPath);
            },

            unbuffered(): AsyncIterableIterator<U> {
                // For pending async json, create an iterator that waits for the stream
                let propertyStream: PropertyStream<U> | null = null;
                let unbufferedIter: AsyncIterableIterator<U> | null = null;

                const iter: AsyncIterableIterator<U> = {
                    [Symbol.asyncIterator]() {
                        return this;
                    },
                    async next(): Promise<IteratorResult<U>> {
                        // Wait for the stream to be available
                        if (!propertyStream) {
                            // Unwrap from container
                            const { stream } = await streamPromise;
                            propertyStream = stream;
                        }

                        // Get or create the unbuffered iterator
                        if (!unbufferedIter) {
                            unbufferedIter = propertyStream!.unbuffered();
                        }

                        return unbufferedIter.next();
                    },
                };
                return iter;
            },
        };

        return asyncJson;
    }

    /**
     * Sets up interception of property stream creation to resolve pending requests.
     */
    private setupPropertyInterception(): void {
        const self = this;

        // Get the controller from the parser
        const controller = (this.parser as any).controller;

        // Patch the controller's getPropertyStream method to intercept property creation
        const originalGetPropertyStream = controller.getPropertyStream.bind(
            controller,
        );
        controller.getPropertyStream = (
            propertyPath: string,
            streamType:
                | "string"
                | "number"
                | "boolean"
                | "null"
                | "object"
                | "array",
        ) => {
            const stream = originalGetPropertyStream(propertyPath, streamType);

            // Resolve any pending requests for this path
            const requests = self.pendingRequests.get(propertyPath);
            if (requests) {
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete(propertyPath);
            }

            return stream;
        };

        // Also patch getObjectProperty and getArrayProperty on the parser
        // to resolve pending requests for root objects/arrays
        const originalGetObjectProperty = (this.parser as any).getObjectProperty
            .bind(this.parser);
        (this.parser as any).getObjectProperty = (propertyPath: string) => {
            const stream = originalGetObjectProperty(propertyPath);

            // Resolve any pending requests for this path
            const requests = self.pendingRequests.get(propertyPath);
            if (requests) {
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete(propertyPath);
            }

            return stream;
        };

        const originalGetArrayProperty = (this.parser as any).getArrayProperty
            .bind(this.parser);
        (this.parser as any).getArrayProperty = (propertyPath: string) => {
            const stream = originalGetArrayProperty(propertyPath);

            // Resolve any pending requests for this path
            const requests = self.pendingRequests.get(propertyPath);
            if (requests) {
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete(propertyPath);
            }

            return stream;
        };

        // Hook into root delegate creation to resolve pending requests for path ""
        (this.parser as any).onRootDelegateCreated = (
            type: "object" | "array",
        ) => {
            const requests = self.pendingRequests.get("");
            if (requests) {
                // Create the root stream now that we know the type
                const stream = type === "object"
                    ? originalGetObjectProperty("")
                    : originalGetArrayProperty("");
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete("");
            }
        };

        // Also hook into handleStreamEnd to reject any remaining pending requests
        const originalHandleStreamEnd = (this.parser as any).handleStreamEnd
            .bind(this.parser);
        (this.parser as any).handleStreamEnd = () => {
            originalHandleStreamEnd();

            // Reject any remaining pending requests
            const error = new Error("Stream ended before property was found");
            for (const requests of self.pendingRequests.values()) {
                for (const request of requests) {
                    request.reject(error);
                }
            }
            self.pendingRequests.clear();
        };
    }
}

export default JsonStream;
