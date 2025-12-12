/**
 * Utility function for streaming text in chunks.
 * Primarily used for testing to simulate LLM streaming behavior.
 */

export interface StreamTextOptions {
    text: string;
    chunkSize: number;
    interval: number; // milliseconds
}

/**
 * Creates an async iterable that emits text in chunks.
 * Useful for testing and simulating LLM streaming responses.
 * This uses async iterables for maximum cross-platform compatibility.
 */
export async function* streamTextInChunks(
    options: StreamTextOptions,
): AsyncGenerator<string, void, unknown> {
    const { text, chunkSize, interval } = options;

    for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);

        if (interval > 0 && i > 0) {
            // Wait before emitting (except for the first chunk)
            await new Promise((resolve) => setTimeout(resolve, interval));
        }

        yield chunk;
    }
}
