/**
 * Utility function for streaming text in chunks.
 * Primarily used for testing to simulate LLM streaming behavior.
 */
import { Readable } from "stream";
export interface StreamTextOptions {
    text: string;
    chunkSize: number;
    interval: number;
}
/**
 * Creates a readable stream that emits text in chunks.
 * Useful for testing and simulating LLM streaming responses.
 */
export declare function streamTextInChunks(options: StreamTextOptions): Readable;
/**
 * Async generator version for more flexible usage.
 */
export declare function streamTextInChunksGenerator(options: StreamTextOptions): AsyncGenerator<string, void, unknown>;
//# sourceMappingURL=stream_text_in_chunks.d.ts.map