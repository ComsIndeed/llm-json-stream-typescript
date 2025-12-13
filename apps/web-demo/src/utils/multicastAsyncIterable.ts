// A tiny async-iterable multicast helper.
//
// Why: an AsyncIterable (like an async generator) is *single-consumer*.
// If you iterate it in two places (UI + parser), they'll steal chunks from each other.
//
// This function fans out each chunk from the source to N independent subscribers.

export function multicastAsyncIterable<T>(
    source: AsyncIterable<T>,
    subscriberCount: number,
): AsyncIterable<T>[] {
    if (subscriberCount <= 0) return [];

    type Resolver = (value: IteratorResult<T>) => void;

    const queues: T[][] = Array.from({ length: subscriberCount }, () => []);
    const resolvers: Array<Resolver | null> = Array.from(
        { length: subscriberCount },
        () => null,
    );

    let sourceDone = false;
    let sourceError: unknown | null = null;

    // Start pumping immediately.
    (async () => {
        try {
            for await (const item of source) {
                for (let i = 0; i < subscriberCount; i++) {
                    const r = resolvers[i];
                    if (r) {
                        resolvers[i] = null;
                        r({ value: item, done: false });
                    } else {
                        queues[i].push(item);
                    }
                }
            }
            sourceDone = true;
            for (let i = 0; i < subscriberCount; i++) {
                const r = resolvers[i];
                if (r) {
                    resolvers[i] = null;
                    r({ value: undefined as unknown as T, done: true });
                }
            }
        } catch (err) {
            sourceError = err;
            sourceDone = true;
            for (let i = 0; i < subscriberCount; i++) {
                const r = resolvers[i];
                if (r) {
                    resolvers[i] = null;
                    // Throwing here is awkward; deliver end, then iterator will throw on next call.
                    r({ value: undefined as unknown as T, done: true });
                }
            }
        }
    })();

    function makeSubscriber(index: number): AsyncIterable<T> {
        return {
            [Symbol.asyncIterator](): AsyncIterator<T> {
                return {
                    async next(): Promise<IteratorResult<T>> {
                        if (queues[index].length > 0) {
                            const value = queues[index].shift()!;
                            return { value, done: false };
                        }

                        if (sourceError) throw sourceError;
                        if (sourceDone) {
                            return {
                                value: undefined as unknown as T,
                                done: true,
                            };
                        }

                        return await new Promise<IteratorResult<T>>(
                            (resolve) => {
                                resolvers[index] = resolve;
                            },
                        );
                    },
                };
            },
        };
    }

    return Array.from({ length: subscriberCount }, (_, i) => makeSubscriber(i));
}
