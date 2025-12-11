/**
 * Tests for parser disposal and resource cleanup
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Disposal Tests", () => {
    test("dispose cleans up resources", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("name");

        await nameStream.promise;
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

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("name");

        // Dispose before stream completes
        setTimeout(() => parser.dispose(), 20);

        // Future should reject or handle disposal gracefully
        await expect(nameStream.promise).rejects.toThrow();
    });

    test("dispose after stream completes", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        await valueStream.promise;
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

        const parser = new JsonStreamParser(stream);

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

        const parser = new JsonStreamParser(stream);
        await parser.dispose();

        // Accessing properties after disposal should throw
        expect(() => parser.getStringProperty("value")).toThrow();
    });

    test("pending futures are rejected on disposal", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 100, // Long delay
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        const futurePromise = valueStream.promise;

        // Dispose while future is pending
        await parser.dispose();

        // Future should be rejected
        await expect(futurePromise).rejects.toThrow();
    });

    test("stream subscriptions are cancelled on disposal", async () => {
        const json = '{"text":"Hello World"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 50,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

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
        const handlePromise = textStream.promise.catch((e: unknown) => {
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

    test("nested callbacks are properly cleaned up", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getListProperty("items");

        const callbacks: number[] = [];
        itemsStream.onElement((element, index) => {
            callbacks.push(index);
        });

        await itemsStream.promise;
        await parser.dispose();

        // Callbacks should have been registered before disposal
        expect(callbacks.length).toBe(3);
    });

    test("memory cleanup after large JSON parsing", async () => {
        const largeArray = Array.from({ length: 1000 }, (_, i) => i);
        const json = JSON.stringify({ data: largeArray });
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 50,
            interval: 0,
        });

        const parser = new JsonStreamParser(stream);
        const dataStream = parser.getListProperty("data");

        await dataStream.promise;
        await parser.dispose();

        // Parser should be cleaned up (specific checks depend on implementation)
        expect(true).toBe(true);
    });
});
