/**
 * Tests for bug diagnosis and debugging scenarios
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Bug Diagnosis Tests", () => {
    test("diagnose: property not completing", async () => {
        // Test that properties complete even with delayed chunks
        const json = '{"value":42}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 50, // Longer delay
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        const startTime = Date.now();
        const value = await valueStream.future;
        const elapsed = Date.now() - startTime;

        expect(value).toBe(42);
        expect(elapsed).toBeGreaterThanOrEqual(50); // Should have waited for chunks
    });

    test("diagnose: stream events not firing", async () => {
        // Test that stream events fire correctly
        const json = '{"text":"Hello World"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        let eventCount = 0;
        textStream.stream.on("data", () => {
            eventCount++;
        });

        await textStream.future;

        expect(eventCount).toBeGreaterThan(0); // Events should have fired
    });

    test("diagnose: incorrect value parsing", async () => {
        // Test that values are parsed correctly with various formats
        const json = '{"int":42,"float":3.14,"neg":-10,"sci":1e5}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        const [int, float, neg, sci] = await Promise.all([
            parser.getNumberProperty("int").future,
            parser.getNumberProperty("float").future,
            parser.getNumberProperty("neg").future,
            parser.getNumberProperty("sci").future,
        ]);

        expect(int).toBe(42);
        expect(float).toBe(3.14);
        expect(neg).toBe(-10);
        expect(sci).toBe(100000);
    });

    test("diagnose: memory leak in callbacks", async () => {
        // Test that callbacks don't accumulate
        const json = '{"list":[1,2,3,4,5]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const listStream = parser.getListProperty("list");

        const elements: number[] = [];

        // Add callback
        listStream.onElement((element) => {
            elements.push(element as unknown as number);
        });

        await listStream.future;

        // Dispose should clean up
        parser.dispose();

        expect(elements).toEqual([1, 2, 3, 4, 5]);
    });

    test("diagnose: race condition in async operations", async () => {
        // Test concurrent property access
        const json = '{"a":1,"b":2,"c":3}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Access properties concurrently
        const promises = [
            parser.getNumberProperty("a").future,
            parser.getNumberProperty("b").future,
            parser.getNumberProperty("c").future,
        ];

        const [a, b, c] = await Promise.all(promises);

        expect([a, b, c]).toEqual([1, 2, 3]);
    });

    test("diagnose: chunk boundary issues", async () => {
        // Test values split across chunk boundaries
        const json = '{"longPropertyName":"longPropertyValue"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10, // Will split property name and value
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const value = await parser.getStringProperty("longPropertyName").future;

        expect(value).toBe("longPropertyValue");
    });

    test("diagnose: escaped characters in strings", async () => {
        // Test that escaped characters are handled correctly
        const json = '{"path":"C:\\\\Users\\\\test\\\\file.txt"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const path = await parser.getStringProperty("path").future;

        expect(path).toBe("C:\\Users\\test\\file.txt");
    });

    test("diagnose: nested access before parent completes", async () => {
        // Test accessing nested properties before parent is fully parsed
        const json = '{"parent":{"child":"value"},"other":"data"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Access child before parent completes
        const childPromise = parser.getStringProperty("parent.child").future;
        const otherPromise = parser.getStringProperty("other").future;

        const [child, other] = await Promise.all([childPromise, otherPromise]);

        expect(child).toBe("value");
        expect(other).toBe("data");
    });
});
