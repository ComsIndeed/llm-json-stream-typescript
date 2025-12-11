/**
 * Utility function for streaming text in chunks.
 * Primarily used for testing to simulate LLM streaming behavior.
 */
import { Readable } from "stream";
/**
 * Creates a readable stream that emits text in chunks.
 * Useful for testing and simulating LLM streaming responses.
 */
export function streamTextInChunks(options) {
    const { text, chunkSize, interval } = options;
    let position = 0;
    let intervalId = null;
    const readable = new Readable({
        read() {
            // Don't do anything here - we'll push from the interval
        },
        destroy(error, callback) {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            callback(error ?? null);
        },
    });
    // Start streaming after a tick to allow listeners to attach
    setImmediate(() => {
        const emitChunk = () => {
            if (position >= text.length) {
                readable.push(null); // End the stream
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                return;
            }
            const chunk = text.slice(position, position + chunkSize);
            position += chunkSize;
            readable.push(chunk);
        };
        if (interval > 0) {
            // Emit first chunk immediately, then set interval for rest
            emitChunk();
            if (position < text.length) {
                intervalId = setInterval(emitChunk, interval);
            }
        }
        else {
            // No delay - emit all chunks immediately
            while (position < text.length) {
                emitChunk();
            }
        }
    });
    return readable;
}
/**
 * Async generator version for more flexible usage.
 */
export async function* streamTextInChunksGenerator(options) {
    const { text, chunkSize, interval } = options;
    for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        if (interval > 0) {
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
        yield chunk;
    }
}
//# sourceMappingURL=stream_text_in_chunks.js.map