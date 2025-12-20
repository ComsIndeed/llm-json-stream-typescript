/**
 * Tests for bug diagnosis and debugging scenarios
 * Uses async iterators as the primary streaming interface.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Bug Diagnosis Tests", () => {
    test("diagnose: property not completing", async () => {
        // Test that properties complete even with delayed chunks
        const json = '{"value":42}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 50, // Longer delay
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<number>("value");

        const startTime = Date.now();
        const value = await valueStream;
        const elapsed = Date.now() - startTime;

        expect(value).toBe(42);
        expect(elapsed).toBeGreaterThanOrEqual(50); // Should have waited for chunks
    });

    test("diagnose: stream events not firing", async () => {
        // Test that stream events fire correctly using async iterator
        const json = '{"text":"Hello World"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const textStream = parser.get<string>("text");

        let eventCount = 0;
        for await (const chunk of textStream) {
            eventCount++;
        }

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

        const parser = JsonStream.parse(stream);

        const [int, float, neg, sci] = await Promise.all([
            parser.get<number>("int"),
            parser.get<number>("float"),
            parser.get<number>("neg"),
            parser.get<number>("sci"),
        ]);

        expect(int).toBe(42);
        expect(float).toBe(3.14);
        expect(neg).toBe(-10);
        expect(sci).toBe(100000);
    });

    test("diagnose: array parsing and iteration", async () => {
        // Test that array elements are properly accessible
        const json = '{"list":[1,2,3,4,5]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        const elements = await parser.get<number[]>("list");

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

        const parser = JsonStream.parse(stream);

        // Access properties concurrently
        const promises = [
            parser.get<number>("a"),
            parser.get<number>("b"),
            parser.get<number>("c"),
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

        const parser = JsonStream.parse(stream);
        const value = await parser.get<string>("longPropertyName");

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

        const parser = JsonStream.parse(stream);
        const path = await parser.get<string>("path");

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

        const parser = JsonStream.parse(stream);

        // Access child before parent completes
        const childPromise = parser.get<string>("parent.child");
        const otherPromise = parser.get<string>("other");

        const [child, other] = await Promise.all([childPromise, otherPromise]);

        expect(child).toBe("value");
        expect(other).toBe("data");
    });
});
