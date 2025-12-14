/**
 * Consume an AsyncIterable and invoke `onValue` for each yielded item.
 * Optionally call `onDone` after the iterable completes normally.
 */
export async function listenTo<T>(
    asyncIterable: AsyncIterable<T>,
    onValue: (value: T) => void | Promise<void>,
    options?: {
        onDone?: () => void | Promise<void>;
        signal?: AbortSignal;
    },
): Promise<void> {
    for await (const chunk of asyncIterable) {
        if (options?.signal?.aborted) {
            break;
        }

        // await in case the consumer returns a promise
        await onValue(chunk);
    }

    if (options?.onDone) {
        await options.onDone();
    }
}
