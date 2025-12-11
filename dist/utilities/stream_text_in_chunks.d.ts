/**
 * Utility function for streaming text in chunks.
 * Primarily used for testing to simulate LLM streaming behavior.
 */
export interface StreamTextOptions {
    text: string;
    chunkSize: number;
    interval: number;
}
/**
 * Creates an async iterable that emits text in chunks.
 * Useful for testing and simulating LLM streaming responses.
 * This uses async iterables for maximum cross-platform compatibility.
 */
export declare function streamTextInChunks(options: StreamTextOptions): AsyncGenerator<string, void, unknown>;
//# sourceMappingURL=stream_text_in_chunks.d.ts.map