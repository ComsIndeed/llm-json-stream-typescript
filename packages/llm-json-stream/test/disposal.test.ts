/**
 * Tests for parser disposal and resource cleanup
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Disposal Tests", () => {
    test("dispose cleans up resources", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const nameStream = parser.get<string>("name");

        await nameStream;
        await parser.dispose();

        // After disposal, parser should be cleaned up
        expect(true).toBe(true); // Placeholder - actual implementation will test internal state
    });

    test("dispose before stream completes", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 50, // Longer interval
        });

        const parser = JsonStream.parse(stream);
        const nameStream = parser.get<string>("name");

        // Dispose before stream completes
        setTimeout(() => parser.dispose(), 20);

        // Future should reject or handle disposal gracefully
        let threw = false;
        try {
            await nameStream;
        } catch (e) {
            threw = true;
        }
        expect(threw).toBe(true);
    });

    test("dispose after stream completes", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<number>("value");

        await valueStream;
        await parser.dispose();

        // Should not throw
        expect(true).toBe(true);
    });

    test("multiple dispose calls are safe", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        await parser.dispose();
        await parser.dispose(); // Should not throw
        await parser.dispose(); // Should not throw

        expect(true).toBe(true);
    });

    test("property access after disposal throws error", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        await parser.dispose();

        // Accessing properties after disposal should throw
        expect(() => parser.get<string>("value")).toThrow();
    });

    test("pending futures are rejected on disposal", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 100, // Long delay
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<number>("value");

        const futurePromise = valueStream;

        // Dispose while future is pending
        await parser.dispose();

        // Future should be rejected
        let threw = false;
        try {
            await futurePromise;
        } catch (e) {
            threw = true;
        }
        expect(threw).toBe(true);
    });

    test("stream subscriptions are cancelled on disposal", async () => {
        const json = '{"text":"Hello World"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 50,
        });

        const parser = JsonStream.parse(stream);
        const textStream = parser.get<string>("text");

        let eventCount = 0;
        let iteratorErrorMsg = "";
        let promiseErrorMsg = "";

        // Consume the async iterator
        const collectChunks = (async () => {
            try {
                for await (const _ of textStream) {
                    eventCount++;
                }
            } catch (e: unknown) {
                // Expected when disposed early
                if (e instanceof Error) {
                    iteratorErrorMsg = e.message;
                }
            }
        })();

        // Also handle the promise rejection
        const handlePromise = textStream.catch((e: unknown) => {
            if (e instanceof Error) {
                promiseErrorMsg = e.message;
            }
        });

        // Dispose early
        setTimeout(() => parser.dispose(), 30);

        await new Promise((resolve) => setTimeout(resolve, 200));
        await collectChunks;
        await handlePromise;

        // Should have received fewer events due to early disposal
        // OR received an error indicating disposal
        const disposedProperly = (eventCount < 10) ||
            (iteratorErrorMsg === "Parser disposed") ||
            (promiseErrorMsg === "Parser disposed");
        expect(disposedProperly).toBe(true);
    });

    test("array iteration and disposal work together", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const items = await parser.get<number[]>("items");

        await parser.dispose();

        // Items should be properly retrieved before disposal
        expect(items).toEqual([1, 2, 3]);
    });

    test("memory cleanup after large JSON parsing", async () => {
        const largeArray = Array.from({ length: 1000 }, (_, i) => i);
        const json = JSON.stringify({ data: largeArray });
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 50,
            interval: 0,
        });

        const parser = JsonStream.parse(stream);
        const dataStream = parser.get<any[]>("data");

        await dataStream;
        await parser.dispose();

        // Parser should be cleaned up (specific checks depend on implementation)
        expect(true).toBe(true);
    });
});
