/**
 * JsonStream - The new unified API for streaming JSON parsing
 *
 * This module provides a modern, type-safe API for parsing streaming JSON data
 * from LLM responses.
 */

import { JsonStreamParser } from "./json_stream_parser.js";
import type { ParseEvent } from "./json_stream_parser.js";
import {
    ArrayPropertyStream,
    ObjectPropertyStream,
    PropertyStream,
} from "./property_stream.js";

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

    /**
     * Whether to skip content inside thinking/reasoning tags.
     * Default: false
     */
    skipThoughts?: boolean;

    /**
     * The start and end delimiters for thinking tags.
     * Default: ['<think>', '</think>']
     */
    thinkingTags?: [string, string];

    /**
     * Logging callback for parser events.
     */
    onLog?: (event: ParseEvent) => void;
}

/**
 * AsyncJson<T> - A unified type that is both a Promise and an AsyncIterable.
 */
export interface AsyncJson<T>
    extends Promise<T>, AsyncIterable<AsyncJsonIteratorYield<T>> {
    /**
     * Get a nested property from this value.
     * @param path - The path to the nested property (supports dot notation and bracket notation)
     */
    get<U>(path: string): AsyncJson<U>;

    /**
     * Returns an unbuffered async iterator that only receives new values from the subscription point.
     */
    unbuffered(): AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
}

/**
 * Type helper to determine what type the async iterator yields.
 */
export type AsyncJsonIteratorYield<T> = T extends (infer E)[] ? AsyncJson<E>
    : T extends Record<string, infer V>
        ? (T extends any[] ? never : [string, AsyncJson<V>])
    : T;

/**
 * Type helper for creating the proxy path type.
 */
export type AsyncJsonPath<T> = T extends Array<infer E> ? AsyncJsonArrayPath<E>
    : T extends object ? AsyncJsonObjectPath<T>
    : AsyncJsonPrimitivePath<T>;

/**
 * Helper type for primitive paths (string, number, boolean, null).
 */
export type AsyncJsonPrimitivePath<T> = AsyncJson<T> & {
    $get<U>(path: string): AsyncJson<U>;
    $as<U>(): AsyncJsonPath<U>;
    $asAsyncJson(): AsyncJson<T>;
    asyncJson(): AsyncJson<T>;
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
        $get<U>(path: string): AsyncJson<U>;
        $as<U>(): AsyncJsonPath<U>;
        $asAsyncJson(): AsyncJson<T>;
        asyncJson(): AsyncJson<T>;
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
        $get<U>(path: string): AsyncJson<U>;
        $as<U>(): AsyncJsonPath<U>;
        $asAsyncJson(): AsyncJson<E[]>;
        asyncJson(): AsyncJson<E[]>;
    };

// ============================================================================
// Implementation
// ============================================================================

/**
 * Creates an async iterator that yields AsyncJson<E> for each array element.
 */
function createArrayElementIterator<E>(
    arrayStream: ArrayPropertyStream<E>,
    jsonStream: JsonStream<any>,
    basePath: string,
): AsyncIterableIterator<AsyncJson<E>> {
    const elementQueue: number[] = [];
    let resolveNext: ((value: IteratorResult<AsyncJson<E>>) => void) | null =
        null;
    let isDone = false;

    arrayStream.onElement((_propertyStream, index) => {
        elementQueue.push(index);
        if (resolveNext) {
            const idx = elementQueue.shift()!;
            const elementPath = basePath ? `${basePath}[${idx}]` : `[${idx}]`;
            const asyncElement = jsonStream.get<E>(elementPath);
            resolveNext({ value: asyncElement, done: false });
            resolveNext = null;
        }
    });

    arrayStream.promise
        .then(() => {
            isDone = true;
            if (resolveNext) {
                resolveNext({ value: undefined as any, done: true });
                resolveNext = null;
            }
        })
        .catch(() => {
            isDone = true;
            if (resolveNext) {
                resolveNext({ value: undefined as any, done: true });
                resolveNext = null;
            }
        });

    const iterator: AsyncIterableIterator<AsyncJson<E>> = {
        [Symbol.asyncIterator]() {
            return this;
        },
        async next(): Promise<IteratorResult<AsyncJson<E>>> {
            if (elementQueue.length > 0) {
                const idx = elementQueue.shift()!;
                const elementPath = basePath ? `${basePath}[${idx}]` : `[${idx}]`;
                const asyncElement = jsonStream.get<E>(elementPath);
                return { value: asyncElement, done: false };
            }

            if (isDone) {
                return { value: undefined as any, done: true };
            }

            return new Promise((resolve) => {
                resolveNext = resolve;
            });
        },
    };

    return iterator;
}

/**
 * Creates an async iterator that yields [key, AsyncJson<V>] tuples for each property.
 */
function createObjectPropertyIterator<V>(
    objectStream: ObjectPropertyStream,
    jsonStream: JsonStream<any>,
    basePath: string,
): AsyncIterableIterator<[string, AsyncJson<V>]> {
    const propertyQueue: string[] = [];
    const yieldedKeys = new Set<string>();
    let resolveNext:
        | ((value: IteratorResult<[string, AsyncJson<V>]>) => void)
        | null = null;
    let isDone = false;
    let allProperties: string[] | null = null;

    objectStream.onProperty((_propertyStream, key) => {
        propertyQueue.push(key);
        if (resolveNext) {
            const propKey = propertyQueue.shift()!;
            yieldedKeys.add(propKey);
            const propertyPath = basePath ? `${basePath}.${propKey}` : propKey;
            const asyncProperty = jsonStream.get<V>(propertyPath);
            resolveNext({ value: [propKey, asyncProperty], done: false });
            resolveNext = null;
        }
    });

    objectStream.promise
        .then((obj) => {
            allProperties = Object.keys(obj);
            for (const key of allProperties) {
                if (!yieldedKeys.has(key) && !propertyQueue.includes(key)) {
                    propertyQueue.push(key);
                }
            }
            isDone = true;
            if (resolveNext) {
                if (propertyQueue.length > 0) {
                    const propKey = propertyQueue.shift()!;
                    yieldedKeys.add(propKey);
                    const propertyPath = basePath
                        ? `${basePath}.${propKey}`
                        : propKey;
                    const asyncProperty = jsonStream.get<V>(propertyPath);
                    resolveNext({
                        value: [propKey, asyncProperty],
                        done: false,
                    });
                } else {
                    resolveNext({ value: undefined as any, done: true });
                }
                resolveNext = null;
            }
        })
        .catch(() => {
            isDone = true;
            if (resolveNext) {
                resolveNext({ value: undefined as any, done: true });
                resolveNext = null;
            }
        });

    const iterator: AsyncIterableIterator<[string, AsyncJson<V>]> = {
        [Symbol.asyncIterator]() {
            return this;
        },
        async next(): Promise<IteratorResult<[string, AsyncJson<V>]>> {
            if (propertyQueue.length > 0) {
                const propKey = propertyQueue.shift()!;
                yieldedKeys.add(propKey);
                const propertyPath = basePath
                    ? `${basePath}.${propKey}`
                    : propKey;
                const asyncProperty = jsonStream.get<V>(propertyPath);
                return { value: [propKey, asyncProperty], done: false };
            }

            if (isDone) {
                return { value: undefined as any, done: true };
            }

            return new Promise((resolve) => {
                resolveNext = resolve;
            });
        },
    };

    return iterator;
}

/**
 * Creates an AsyncJson wrapper around a PropertyStream.
 */
function createAsyncJsonFromStream<T>(
    propertyStream: PropertyStream<T>,
    jsonStream: JsonStream<any>,
    basePath: string,
): AsyncJson<T> {
    const promise = propertyStream.promise;

    const isArrayStream = propertyStream instanceof ArrayPropertyStream ||
        propertyStream.constructor.name === "ArrayPropertyStream";
    const isObjectStream = propertyStream instanceof ObjectPropertyStream ||
        propertyStream.constructor.name === "ObjectPropertyStream";

    const asyncJson: AsyncJson<T> = {
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

        [Symbol.toStringTag]: "AsyncJson",

        [Symbol.asyncIterator](): AsyncIterableIterator<
            AsyncJsonIteratorYield<T>
        > {
            if (isArrayStream) {
                return createArrayElementIterator(
                    propertyStream as unknown as ArrayPropertyStream<any>,
                    jsonStream,
                    basePath,
                ) as AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
            } else if (isObjectStream) {
                return createObjectPropertyIterator(
                    propertyStream as unknown as ObjectPropertyStream,
                    jsonStream,
                    basePath,
                ) as AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
            } else {
                return propertyStream
                    [Symbol.asyncIterator]() as AsyncIterableIterator<
                        AsyncJsonIteratorYield<T>
                    >;
            }
        },

        get<U>(path: string): AsyncJson<U> {
            const fullPath = basePath ? `${basePath}.${path}` : path;
            return jsonStream.get<U>(fullPath);
        },

        unbuffered(): AsyncIterableIterator<AsyncJsonIteratorYield<T>> {
            if (isArrayStream) {
                return createArrayElementIterator(
                    propertyStream as unknown as ArrayPropertyStream<any>,
                    jsonStream,
                    basePath,
                ) as AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
            } else if (isObjectStream) {
                return createObjectPropertyIterator(
                    propertyStream as unknown as ObjectPropertyStream,
                    jsonStream,
                    basePath,
                ) as AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
            } else {
                return propertyStream.unbuffered() as AsyncIterableIterator<
                    AsyncJsonIteratorYield<T>
                >;
            }
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
    let cachedAsyncJson: AsyncJson<T> | null = null;
    const getAsyncJson = () => {
        if (!cachedAsyncJson) {
            cachedAsyncJson = jsonStream.get<T>(basePath);
        }
        return cachedAsyncJson;
    };

    return new Proxy({} as any, {
        get(target, prop, receiver) {
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

            if (prop === Symbol.asyncIterator) {
                const asyncJson = getAsyncJson();
                return asyncJson[Symbol.asyncIterator].bind(asyncJson);
            }

            if (prop === Symbol.toStringTag) {
                return "AsyncJsonPath";
            }

            if (prop === "toJSON") {
                return () => undefined;
            }

            if (prop === Symbol.for("nodejs.util.inspect.custom")) {
                return () => `[AsyncJsonPath: ${basePath || "root"}]`;
            }

            if (
                prop === "__esModule" ||
                prop === "$$typeof" ||
                prop === "_isVue" ||
                prop === "__v_isRef" ||
                prop === "constructor"
            ) {
                return undefined;
            }

            if (prop === "$get") {
                return <U>(innerPath: string): AsyncJson<U> => {
                    const fullPath = basePath
                        ? `${basePath}.${innerPath}`
                        : innerPath;
                    return jsonStream.get<U>(fullPath);
                };
            }

            if (prop === "$as") {
                return <U>(): AsyncJsonPath<U> => {
                    return (jsonStream as any)._getPathProxy(basePath);
                };
            }

            if (prop === "$asAsyncJson") {
                return (): AsyncJson<T> => {
                    return getAsyncJson();
                };
            }

            if (prop === "asyncJson") {
                return (): AsyncJson<T> => {
                    return getAsyncJson();
                };
            }

            if (prop === "get") {
                const asyncJson = getAsyncJson();
                return asyncJson.get.bind(asyncJson);
            }

            if (prop === "unbuffered") {
                const asyncJson = getAsyncJson();
                return asyncJson.unbuffered.bind(asyncJson);
            }

            if (typeof prop === "string" && /^\d+$/.test(prop)) {
                const index = parseInt(prop, 10);
                const newPath = basePath
                    ? `${basePath}[${index}]`
                    : `[${index}]`;
                return (jsonStream as any)._getPathProxy(newPath);
            }

            if (typeof prop === "string") {
                const newPath = basePath ? `${basePath}.${prop}` : prop;
                return (jsonStream as any)._getPathProxy(newPath);
            }

            return Reflect.get(target, prop, receiver);
        },
    }) as AsyncJsonPath<T>;
}

// ============================================================================
// JsonStream Class
// ============================================================================

interface PendingPropertyRequest<T> {
    resolve: (stream: PropertyStream<T>) => void;
    reject: (error: Error) => void;
}

/**
 * JsonStream<T> - The main parser object for streaming JSON parsing.
 */
export class JsonStream<T = any> {
    private parser: JsonStreamParser;
    private pendingRequests: Map<string, PendingPropertyRequest<any>[]> =
        new Map();
    private disposed = false;

    // Reference stability caching
    private cachedAsyncJsons: Map<string, AsyncJson<any>> = new Map();
    private cachedProxies: Map<string, AsyncJsonPath<any>> = new Map();

    private constructor(
        stream: AsyncIterable<string>,
        options?: JsonStreamOptions,
    ) {
        this.parser = new JsonStreamParser(stream, options);
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
     * Guarantees reference identity stability (returns exact same instance on multiple calls).
     *
     * @param path - The path to the property
     * @returns An AsyncJson that can be awaited or iterated
     */
    get<U>(path: string): AsyncJson<U> {
        this.checkDisposed();

        const cached = this.cachedAsyncJsons.get(path);
        if (cached) {
            return cached as AsyncJson<U>;
        }

        let result: AsyncJson<U>;
        const existingController = (this.parser as any).propertyControllers?.get(path);
        if (existingController) {
            result = createAsyncJsonFromStream<U>(
                existingController.propertyStream,
                this,
                path,
            );
        } else {
            result = this.createPendingAsyncJson<U>(path);
        }

        this.cachedAsyncJsons.set(path, result);
        return result;
    }

    /**
     * Returns a proxy object for ergonomic property access.
     * Guarantees reference identity stability for all nested paths.
     *
     * @returns An AsyncJsonPath proxy for the root object
     */
    paths(): AsyncJsonPath<T> {
        this.checkDisposed();
        return this._getPathProxy<T>("");
    }

    /**
     * Root convenience getter returning the root object promise.
     */
    get future(): Promise<T> {
        return this.get<T>("");
    }

    /**
     * Root convenience getter returning the root object stream.
     */
    get stream(): AsyncJson<T> {
        return this.get<T>("");
    }

    /**
     * Internal method to get or create a cached proxy path.
     * @internal
     */
    private _getPathProxy<U>(path: string): AsyncJsonPath<U> {
        let proxy = this.cachedProxies.get(path);
        if (!proxy) {
            proxy = createPathProxy<U>(this, path);
            this.cachedProxies.set(path, proxy);
        }
        return proxy as AsyncJsonPath<U>;
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
        this.cachedAsyncJsons.clear();
        this.cachedProxies.clear();

        await this.parser.dispose();
    }

    private checkDisposed(): void {
        if (this.disposed) {
            throw new Error("JsonStream has been disposed");
        }
    }

    private createPendingAsyncJson<U>(path: string): AsyncJson<U> {
        let resolveStream: (wrapped: { stream: PropertyStream<U> }) => void;
        let rejectStream: (error: Error) => void;
        const streamPromise = new Promise<{ stream: PropertyStream<U> }>(
            (resolve, reject) => {
                resolveStream = resolve;
                rejectStream = reject;
            },
        );

        let requests = this.pendingRequests.get(path);
        if (!requests) {
            requests = [];
            this.pendingRequests.set(path, requests);
        }
        requests.push({
            resolve: (stream: PropertyStream<U>) => resolveStream!({ stream }),
            reject: rejectStream!,
        });

        const valuePromise = streamPromise.then(({ stream }) => stream.promise);
        // Prevent unhandled promise rejections globally if the promise is discarded or disposed
        valuePromise.catch(() => {});
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

            [Symbol.asyncIterator](): AsyncIterableIterator<
                AsyncJsonIteratorYield<U>
            > {
                let wrappedAsyncJson: AsyncJson<U> | null = null;
                let streamIterator:
                    | AsyncIterableIterator<AsyncJsonIteratorYield<U>>
                    | null = null;

                const iter: AsyncIterableIterator<AsyncJsonIteratorYield<U>> = {
                    [Symbol.asyncIterator]() {
                        return this;
                    },
                    async next(): Promise<
                        IteratorResult<AsyncJsonIteratorYield<U>>
                    > {
                        if (!wrappedAsyncJson) {
                            const { stream } = await streamPromise;
                            wrappedAsyncJson = createAsyncJsonFromStream<U>(
                                stream,
                                self,
                                path,
                            );
                        }

                        if (!streamIterator) {
                            streamIterator = wrappedAsyncJson
                                [
                                    Symbol.asyncIterator
                                ]() as AsyncIterableIterator<
                                    AsyncJsonIteratorYield<U>
                                >;
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

            unbuffered(): AsyncIterableIterator<AsyncJsonIteratorYield<U>> {
                let wrappedAsyncJson: AsyncJson<U> | null = null;
                let unbufferedIter:
                    | AsyncIterableIterator<AsyncJsonIteratorYield<U>>
                    | null = null;

                const iter: AsyncIterableIterator<AsyncJsonIteratorYield<U>> = {
                    [Symbol.asyncIterator]() {
                        return this;
                    },
                    async next(): Promise<
                        IteratorResult<AsyncJsonIteratorYield<U>>
                    > {
                        if (!wrappedAsyncJson) {
                            const { stream } = await streamPromise;
                            wrappedAsyncJson = createAsyncJsonFromStream<U>(
                                stream,
                                self,
                                path,
                            );
                        }

                        if (!unbufferedIter) {
                            unbufferedIter = wrappedAsyncJson
                                .unbuffered() as AsyncIterableIterator<
                                    AsyncJsonIteratorYield<U>
                                >;
                        }

                        return unbufferedIter.next();
                    },
                };
                return iter;
            },
        };

        return asyncJson;
    }

    private setupPropertyInterception(): void {
        const self = this;
        const controller = (this.parser as any).controller;

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

            const requests = self.pendingRequests.get(propertyPath);
            if (requests) {
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete(propertyPath);
            }

            return stream;
        };

        const originalGetObjectProperty = (this.parser as any).getObjectProperty
            .bind(
                this.parser,
            );
        (this.parser as any).getObjectProperty = (propertyPath: string) => {
            const stream = originalGetObjectProperty(propertyPath);

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
            .bind(
                this.parser,
            );
        (this.parser as any).getArrayProperty = (propertyPath: string) => {
            const stream = originalGetArrayProperty(propertyPath);

            const requests = self.pendingRequests.get(propertyPath);
            if (requests) {
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete(propertyPath);
            }

            return stream;
        };

        (this.parser as any).onRootDelegateCreated = (
            type: "object" | "array",
        ) => {
            const requests = self.pendingRequests.get("");
            if (requests) {
                const stream = type === "object"
                    ? originalGetObjectProperty("")
                    : originalGetArrayProperty("");
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete("");
            }
        };

        const originalHandleStreamEnd = (this.parser as any).handleStreamEnd
            .bind(
                this.parser,
            );
        (this.parser as any).handleStreamEnd = () => {
            originalHandleStreamEnd();

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
