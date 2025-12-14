/**
 * Consume an AsyncIterable and invoke `onValue` for each yielded item.
 * Optionally call `onDone` after the iterable completes normally.
 */
export async function listenTo<T>(
    asyncIterable: AsyncIterable<T>,
    onValue: (value: T) => void | Promise<void>,
    onDone?: () => void | Promise<void>,
): Promise<void> {
    for await (const chunk of asyncIterable) {
        // await in case the consumer returns a promise
        await onValue(chunk);
    }

    if (onDone) {
        await onDone();
    }
}
