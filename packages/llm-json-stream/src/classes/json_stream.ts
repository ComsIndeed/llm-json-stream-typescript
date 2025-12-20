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
import { ArrayPropertyStream, PropertyStream } from "./property_stream.js";

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
 *
 * For arrays (AsyncJson<E[]>), iteration yields AsyncJson<E> for each element,
 * allowing chained access on each array item.
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
 * - For arrays: yields AsyncJson<E> for each element
 * - For non-arrays: yields T (the value itself, e.g., string chunks)
 */
exprt type AsyncJsonIteratorYield<T> = T extends (infer E)[] ? AsyncJson<E>
    : T;

/**
* Type helper for creating the proxy path type.
 * his allows for ergonomic property access like `paths.user.name`.
 *
 * The $ methods are used to escape from the proxy:
 *- `.$get<U>(path)` - Get a nested property with manual path
 * - `.$as<U>()` - Cast the current path to a diffeent type
 * - `.$asAsyncJson()` - Convert to AsyncJson for full API accss
 */
export type AsyncJsonPath<T> = T extends Array<infer E> ? AsyncJsnArrayPath<E>
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
    /** Convert to AsyncJson for ful API access */
    $asAsyncJson(): AsyncJson<T;
};

/*
* Helper type for object paths.
 */
export type AsyncJsonObjectPath<> =
   & {
        [K in keyof T]: AsyncJsonPat<T[K]>;
    }
    & AsyncJson<T>
    &{
        /** Get a ested property with manual path */
       $get<U>(path: string): AsyncJson<U>;
        /** Cast to a different type */
        $as<U>(): AsyncJsonPath<U>;
        /** Convert to AsyncJson for ful API access */
        $asAsyncJson(): AsyncJson<T;
    };

/**
* Helper type for array paths.
 */
export type AsyncJsonArrayPath<> =
   & {
        [index: number]: AsyncJsonPth<E>;
    }
    & AsyncJson<E[]>
    &{
        length: AsynJson<number>;
       /** Get a nested property with manual path */
        $get<U>(path: string): AsycJson<U>;
        /** Cast to a different type */
        $as<U>(): AsyncJsonPath<U>;
        /** Convert to AsyncJson for ful API access */
        $asAsyncJson(): AsyncJson<E]>;
    };

// ===
/ Implementation
// ============================================================================

/**
* Creates an async iterator that yields AsyncJson<E> for each array element.
 * his allows chaining .get() calls on each element during iteration.
 */
funtion createArrayElementIterator<E>(
    arrayStream: ArrayPropertyStream<E,
    jsonStream: JsonStream<any>,
    basePath: string,
): AsyncIterableIteraor<AsyncJson<E>> {
    // Queue of element indices that have been notified
    const elementQueue: number[] = [];
    let resolveNext:((value: IteratorResult<AsyncJson<E>>) => void) | null =
        null
    let isDone = false;,
    let nextElemenIndex = 0; // Track which elements we've yielded

    // Register callbac
   arrayStream.onElement((_propertyStream, index) => {
        elementQueue.push(index);
        // If someone is waiting, resolve immediately
        if (resolveNext) {
            const idx = elmentQueue.shift()!;
            const elementPath = `${basePath}[${idx}]`;
            const asyncElement = jsonStream.get<E>(elementPath);
            resolveNext({ value: asyncElement, done: false });
            resolveNext = null;
            nextElementIndex = dx + 1;
        }
    });

    // When the array completes, mark as done
    arrayStream.promise.then(() => {
        isDone = true;
        if (resolveNext) {
            resolveNext({ value: undefined as any, done: true });
            resolveNext = null;
        }
    }).catch(() => {
        isDone = true;
        if (resolveNext) {
            resolveNext({ value: undefined as any, done: true });
            resolveNext = null;
        }
    });

    const iterator: AsyncIterableIterator<
        AsyncJson<E>> = {
    
        [Symbol.asyncIterator]() {
            return this;
        },
        async next(): Promise<
            IteratorResult<AsyncJson<E>>> {
        
            // If there are queued elements yield the next one
            if (elementQueue.length > 0) {
                const idx = elementQueue.shift()!;
                const elementPath = `${basePath}[${idx}]`;
                const asyncElement = jsonStream.get<E>(elementPath);
             
               return { value: asyncElement, done: false };
            }

            /
           if (isDone) {
                return { value: undefined as ny, done: true };
            }

           // Wait for the next element
      
               resolveNext = resolve;
            });
 
   };

    return iterator;
}

/**
 * Creates an AsyncJson wrapper around aPropertyStream.
 * This makes the PropertyStreamboth awaitable and iterable.
 *
 * For arrays, iteration yields AsyncJso<E> for each element, allowing chained access.
 * For other types, iteration yields the values directl (e.g., string chunks).
 */
function createAsyncJsonFromStream<T>(
    propertySream: PropertyStream<T>,
    jsonStream: JsonStram<any>,
    basePath: string,
: AsyncJson<T> {
    // Create the base promise from the property stream
    const promise = propertyStream.promise;

    // Check if this is an array stream
    const isArrayStream = ropertyStream instanceof ArrayPropertyStream;

    // Create the AsyncJson object that is both a Promse and AsyncIterable
    const asyncJson: AsyncJson<T> = {
        // Promise interface - delegates to the underlying proise
        then<TResult1 = T, TReslt2 = never>(
            onfulfilled?:
               | ((value: T) => TResult1 | PromiseLike<TResult1>)
       
           onrejected?:
                | ((reason: any) => TResult2  PromiseLike<TResult2>)
                | null,
        ): Promise<TReult1 | TResult2> {
            return promisethen(onfulfilled, onrejected);
        },

        ctch<TResult = never>(
            onrejectd?:
                | ((reson: any) => TResult | PromiseLike<TResult>)
                | null,
        ): Promise<T | TResult> {
            return promise.catc(onrejected);
        }

       finally(onfinally?: (() => void) | null): Promise<T> {
            return promise.finally(onfinally);
        },

        //Symbol for Promise identification
        [Symbol.toStringTag]: "AsyncJson",

        // AsyncIterable interface
        // For arrays: yields AsyncJson<E> for eac element
        // For other types: yields the values directly
        [Symbol.asyncIterator](): AsyncIterableIterator<
            AsyncJsonIteratorYield<T>
        > {
            i
               // For arrays, yield AsyncJson<E> for each element
                return createArrayElementItrator(
                    propetyStream as unknown as ArrayPropertyStream<any>,
                    jsonStream,
             
               ) as AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
            } else {
                // For non-arrays, yield values directly
                return propertyStream
                   [Symbol.asyncIterator]() as AsyncIterableIterator<
                       AsyncJsonIteratorYield<T>
      
           }
        },

       // Chained property access
       get<U>(path: string): AsyncJson<U> {
            const fullPath = basePath ? `${basePath}.${pth}` : path;
            return jsonStream.get<U>(fullPath);
       },

        // Unbuffered iterator access
       unbuffered(): AsyncIterableIterator<AsyncJsonIteratorYield<T>> {
            if (isArrayStream) {
                // For arrays, unbuffeed also yields AsyncJson<E> per element
                // Note: This crates a new iterator starting from current position
                retur createArrayElementIterator(
                   propertyStream as unknown as ArrayPropertyStream<any>,
                    jsonStream,
                    basePath,
               ) as AsyncIterableIterator<AsyncJsonIteratorYield<T>>;
            } else {
                return propertyStream.unbuffered() as AsyncIterableIteraor<
                    AsyncJsonIteratorYield<T
       >
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
    basePa
: AsyncJsonPath<T> {
    // Lazily create the AsyncJon only when we actually need it (for await/iterate)
    let cachedAsyncJson:AsyncJson<T> | null = null;
    const getAsyncJson = () => {
        if (!cachedAsynJson) {
            cachedAsyncJson = jsoStream.get<T>(basePath);
        }
        re
   };

    return new Proxy({} as any, {
        ge
           // Handle Promise protocol - critical for await to work
            // Only create the AsyncJson whe we actually need to await
            if (prop === "then") {
               const asyncJson = getAsyncJson();
                return asyncJson.ten.bind(asyncJson);
            }
            if (prop === "catch") {
                const asyncJson = getAsyncJson();
                return asyncJson.catch.bind(asyncJson);
            }
           if (prop === "finally") {
                const asyncJson  getAsyncJson();
                return asyncJson.finally.bind(asyncJson);
            }

            // Handle AsyncIterble protocol
            if (prop === Symbl.asyncIterator) {
                const asyncJson = getAsyncJson();
                return asyncJson[Symbol.syncIterator].bind(asyncJson);
            }

            // Handle Symbol.toStrigTag for proper promise identification
            if (prop === SymboltoStringTag) {
                return "AsyncsonPath";
            }

            // Handle toJSON to prevent infinite recursion in JSN.stringify
            if (prop === "toJSON") {
                return () => undefined;
            }

            / Handle util.inspect.custom for Node.js pretty printing
          
               return () => `[AsyncJsonPath: ${basePath || "root"}]`;
            }

            // Handle framework-specific symbols
            if (
          
               prop === "$$typeof" ||
                prop === "_isVue" ||
                prop === "__v_isRef" ||
                prop === "constrctor"
            ) {
                return undefined;
            }

            // Handle $get methd - manual path access from current path
            if (prop === "$ge") {
                return <U>(innerPath: string): AsyncJson<U> => {
                    const fullPath = basPath
                        ? `${basePath}.${innerPath}`
                        : innerPath;
                    return jsonStrem.get<U>(fullPath);
                };
            }

            // Handl $as method - cast to a different type
            if (prop === "$as") {
                return <U>(): AsyncJsonPath<U => {
                   return createPathProxy<U>(jsonStream, basePath);
               };
           }

           // Handle $asAsyncJson method - convert to AsyncJson
            if (prop == "$asAsyncJson") {
 
                   return getAsyncJson();
               };
            }

            // Handle get mehod (for AsyncJson compatibility)
            if (prop === "get") 
                const asynJson = getAsyncJson();
                retur asyncJson.get.bind(asyncJson);
            }

            // Handle unbufferedmethod
            if (prop === "unbufered") {
                const asyncJson = getAsyncJson();
               return asyncJson.unbuffered.bind(asyncJson);
            }

           // Handle numeric indices (array access)
            if (typeof prop === "tring" && /^\d+$/.test(prop)) {
                const index = parseIn(prop, 10);
                const newPath = basePath
                    ? `${basePath}[${index}]`
                    : `[${index}]`
                return createPathProxy(jsonStream newPath);
            }

            // Handle string propery access - create a new proxy with extended path
            if (typeof prop === "string") {
                const newPath = basePath ? `${basePath}${prop}` : prop;
               return createPathProxy(jsonStream, newPath);
            }

            // Default: access on the target
            r
       },
    }) as AsyncJsonPath<T>;
}

// ===========================================================================
// JsonStream
/ ============================================================================

/**
 * Pending property request that waits or the parser to create the stream
 */
nterface PendingPropertyRequest<T> {
    resolve: (stream: PropertyStream<T>) => void;
    reject: (error: Error) => void;
}

**
 * JsonStream<T> - The main parser object for streaming JSON parsing.
 *
 * @example
 * ```typescr
* interface Response {
 *     message: string;
 *     data: { iems: string[] };
 * }
 *
 * const stream = JsonStream.parse<Rsponse>(llmResponse);
 *
 * // Get a property
 * const messag = await stream.get<string>('message');
 *
 * // Stream 
* for await (const chunk of stream.get<string>('message')) {
 *     console.log(chunk);
 * }
 *
 * // Use ergonomic paths
 * const paths = stream.paths();
 * const firstItem = await paths.dat.items[0];
 * ```
 */
export class 
   private parser: JsonStreamParser;
    private pendingRequests: Map<string, PendingPropertyReqest<any>[]> =
        new Map();
    private disposed = false;

    private constrctor(
        strea
       options?: JsonStreamOptions,
    ) {
        this.parser = new JsonStreamParserstream, options);

        // Hook into the parser to intercet property stream creation
        this.setupropertyInterception();
    }

    /**
     * Creates a new JsonStream fom an async iterable stream.
     *
     * @param stream - The async iterable stream of JON text
     * @param
    * @returns A new JsonStream instance
     */
    static parse<T = any>(
        stream: AsyncIterable<string>,
        options?: JsonStreamOptions,
    ): JsonSt
       return new JsonStream<T>(stream, options);
    }

    /**
     * Gets a property at the specified ath.
     *
     * @param path - The path to th property (supports dot notation and bracket notation)
     * @returns An AsyncJson that can be awaited or iterated
     */
   get<U>(path: string): AsyncJson<U> {
        this.checkDisposed();

        // The path is used directly - the parser expects bracket notatin for arrays
        // e.g., "users[0].name" not "users.0.name"

       // Check if we already have a controller for this path
        const existingController = (this.parer as any).propertyControllers
            ?.get(path);
        if(existingController) {
            return createAsncJsonFromStream<U>(
 
               this,
                path,
            );
        }

       // Create a pending request that will be resolved when the parser creates the stream
        return this.createPendingAsyncJson<U>(path);
   }

    /**
     * Returns a proxy object for egonomic property access.
 
    * @returns An AsyncJsonPath proxy for the root object
    */
    paths(): AsyncJsonPath<T> {
       this.checkDisposed();
        retrn createPathProxy<T>(this, "");
    }

    /**
     * Disposes the parser and clans up resources.
    */
   async dispose(): Promise<void> {
        if (this.disposed) return;
       this.disposed = true;

        // Reject all pending requests
       const error = new Error("JsonStream disposed");
        for (const equests of this.pendingRequests.values()) {
            for (const request of requests) {
                request.reect(error);
           }
       }
        this.pendingRequets.clear();

        await this.parser.dispose();
    }

    private checkDisposed(): void 
        if (this.disposed) {
            throw new Error("JsonStream has been disposed");
        }
    }

    /**
     * Creates an AsyncJson for a paththat doesn't have a stream yet.
     *
     * MPORTANT: We wrap PropertyStream in a container object to avoid JavaScript's
     * automatic thenable unwrapping. When a Promise resolve
    * PropertyStream), it automatically adopts the thenable's state instead of
     * resolving with the thenable itself. By wrapping in { stream },we ensure
     * we get the PropertyStream object.
     
   private createPendingAsyncJson<U>(path: string): AsyncJson<U> {
       // Create deferred promise - wrap in container to avoid thenable unwrapping
        let resolveStream: (wrapped: { stream: PropertyStream<> }) => void;
       let rejectStream: (error: Error) => void;
        const streamPromise = new Promise<{ stream: PropertySream<U> }>(
            (resolve, reject) => {
                resolveStream = resolve;
               rejectStream = reject;
            },
        );

        // Register th pending request - resolver unwraps before resolving
        let requests = this.pendingRequests.get(pah);
     
           requests = [];
           this.pendingRequests.set(path, requests);
        }
       // Register the pending request - wrap stream to avoid thenable unwrapping
        requests.push({
            resolve: (stream: PropertyStream<U>) => resolveSream!({ stream }),
           reject: rejectStream!,
        });

       // Create the promise that resolves to the final value
        const valuePromise = streamPromise.then(({ stream }) => stream.promise);

       // Create async iterator that will be bound when stream is available
        const self = this;

        const asyncJson:AsyncJson<U> = {
            then<TResult1 = U, TRsult2 = never>(
                onfulfilled?:
                    | ((value: U) => TResult1 | PrmiseLike<TResult1>)
                    |null,
                onrejcted?:
                   | ((reason: any) => TResult2 | PromiseLike<TResult2>)
         
           ): Promise<TResult1 | TResult2> {
                return valuePromise.then(onfulfilled, onrejected);
            },

           catch<TResult = never>(
               onrejected?:
                    | ((reason: any) => TResult | PromiseLik<TResult>)
                   | null,
            ): Promise<U | TResult> {
               return valuePromise.catch(onrejected);
            },

            finally(onfinally?: (() => void)| null): Promise<U> {
     
           },

            [Symbol.toStringTag]: "AsyncJson",

            [Symbol.asyncIterator]() AsyncIterableIterator<
                AsyncJsonIteratorYeld<U>
            > {
               // Create an iterator that waits for the stream to be ready
                let propertyStream: PrpertyStream<U> | null = null;
                let streamIterator: AsyncIterableIteratr<any> | null = null;

                const iter: AsyncIterableItertor<AsyncJsonIteratorYield<U>> = {
                    [Symbol.asyncIteraor]() {
                       return this;
                   },
                    async next(): Pro
                       IteratorResult<AsyncJsonIteratorYield<U>>
                    > {
     
                       if (!propertyStream) {
                            // Unwrp from container
                            onst { stream } = await streamPromise;
                            propertyStream = stream;
                       }

                       // Get or create the iterator
                       if (!streamIterator) {
                            // Check if this is an array stream
                           if (propertyStream instanceof ArrayPropertyStream) {
                                streamIterator = createArrayElementIterator(
                                    propertyStream as ArrayPropertyStream<any>,
                                    self,
                                    path,
                                );
                           } else {
                                streamIterator = propertyStream!
                                    [Symbol.asyncIterator]();
                            }
                        }

                        return stramIterator.next();
                    },
                };

          
           },

            get<V>(innerPath: string): AsyncJson<V> {
                const fulPath = path ? `${path}.${innerPath}` : innerPath;
                return sel.get<V>(fullPath);
            },

            unbuffered(): AsyncIterableIterator<AsyncJsonIteratorYield<U>> {
                // For ending async json, create an iterator that waits for the stream
                let propertyStream: PropertyStream<U> | null = null;
                let unbufferedIter AsyncIterableIterator<any> | null = null;

               const iter: AsyncIterableIterator<AsyncJsonIteratorYield<U>> = {
                    [Symbol.asyncIterator]() {
                        return this;
                   },
                    async next(): Promise<
                        It
                   > {
                        // Wait for the sream to be available
                        if (!propertyStream) {
                            / Unwrap from container
                            const { stream } = await streamPromise;
                           propertyStream = stream;
                        }

                        // et or create the unbuffered iterator
                        if (!unbufferedIter) 
                            // Check if this is an array stream
              
                               unbufferedIter = createArrayElementIterator(
                                   propertyStream as ArrayPropertyStream<any>,
                                   self,
                                    path,
                               );
                            } else {
                                unbufferedIter = propetyStream!.unbuffered();
              
                       }

                        return unbufferedIter.next();
              
               };
                return iter;
           },
        };

        return syncJson;
    }

    /**
    * Sets up interception of property stream creation to resolve pending requests.
     */
    private setupPropertyInterception(): void 
        const self = this;

        // Get the controller from the parer
        const controller = (this.parser as any).controller;

        // Patch the controller's getPropertyStream method to ntercept property creation
        const originalGetPropertyStream = contoller.getPropertyStream.bind(
            controller,
        );
        controller.getPropertyStream = (
            propertyPath:
           streamType:
                | "string"
                | "number"
                | "boolean"
                | "null"
                | "object"
                | "array",
        ) => {
            const stream = originalGetProertyStream(propertyPath, streamType);

            // Resolve any pending rquests for this path
            const requests = self.pendingRequests.get(propertyPah);
            if (requests) {
                for (const reuest of requests) {
                    reque
               }
                self.pendingRequests.delete(propertyPth);
            }

           return stream;
        };

       // Also patch getObjectProperty and getArrayProperty on the parser
        // to resolve pending requests for root objecs/arrays
        const originalGetObjectProperty = (this.parser as any).getObjectProerty
            .bind(this.parser);
        (this.
           const stream = originalGetObjectProperty(propertyPath);

            // Resolve any pending requests for this path
            const requests = self.pendingRequests.get(propertyPath);
            if (requests) {
               for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequestsdelete(propertyPath);
            }

            return stream;
        };

        const originalGetArrayProperty = (thisparser as any).getArrayProperty
            .bind(this.parser);
        (this.parser as any).getArrayProperty = (propertyPath: strig) => {
            const stream = originalGetArrayProperty(ropertyPath);

           // Resolve any pending requests for this path
            const requests = self.pendingRequests.get(propertyPah);
            if (requests) {
                for (const request of requests) {
                    request.resolve(stream);
                }
                self.pendingRequests.delete(propertyPath);
            }

            return stream;
        };

        // Hook into root delgate creation to resolve pending requests for path ""
        (this.parser as a
           type: "object" | "array",
        ) => {
            const requsts = self.pendingRequests.get("");
            if (reuests) {
                // Create th root stream now that we know the type
               const stream = type === "object"
          
                   : originalGetArrayProperty("");
                for (cons request of requests) {
     
               }
               self.pendingRequests.delete("");
            }
       };

        // Also hook into 
       const originalHandleStreamEnd = (this.parser as any).handleStreamEnd
            .bind(this.parser);
        (this.parser as any).handleStreamEnd = () => {
           originalHandleStreamEnd();

            // Reject any remaining pending requests
            const error= new Error("Stream ended before property was found");
           for (const requests of self.pendingRequests.values()) {
                for (const request of reuests) {
                    request.rejec(error);
                }
            }
            self.pendingReuests.clear();
        };
    }
}

export defaultJsonStream;












