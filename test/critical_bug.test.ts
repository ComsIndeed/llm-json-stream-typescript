/**
 * Tests for critical bug fixes and regressions
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Critical Bug Tests", () => {
    test("chunk boundary bug - string not flushing", async () => {
        // Tests the bug where string chunks weren't emitted when chunk ended
        const json = '{"message":"Hello World"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10, // Chunk ends mid-string
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const messageStream = parser.getStringProperty("message");

        const chunks: string[] = [];
        messageStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const message = await messageStream.promise;

        expect(message).toBe("Hello World");
        expect(chunks.length).toBeGreaterThan(0); // Should have emitted chunks
    });

    test("nested list callback disposal bug", async () => {
        // Tests proper cleanup of onElement callbacks
        const json = '{"outer":[{"inner":[1,2,3]}]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const outerStream = parser.getListProperty("outer");

        let innerCallbackCount = 0;

        outerStream.onElement((element, index) => {
            if (index === 0) {
                // Access nested list
                const innerStream = parser.getListProperty("outer[0].inner");
                innerStream.onElement(() => {
                    innerCallbackCount++;
                });
            }
        });

        await outerStream.promise;

        // Callbacks should have been called
        expect(innerCallbackCount).toBe(3);

        // Dispose should clean up without errors
        parser.dispose();
    });

    test("multiline JSON parsing bug", async () => {
        // Tests handling of newlines in JSON
        const json = `{
      "name": "Test",
      "value": 42
    }`;

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = await parser.getStringProperty("name").promise;
        const value = await parser.getNumberProperty("value").promise;

        expect(name).toBe("Test");
        expect(value).toBe(42);
    });

    test("escape sequence handling bug", async () => {
        // Tests proper parsing of escape sequences
        const json = '{"text":"Line\\nBreak\\tTab\\"Quote\\\\Backslash"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8, // Split escape sequences
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const text = await parser.getStringProperty("text").promise;

        expect(text).toBe('Line\nBreak\tTab"Quote\\Backslash');
    });

    test("property path resolution bug", async () => {
        // Tests correct resolution of nested paths
        const json = '{"a":{"b":{"c":"value"}}}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Access in different orders
        const [direct, stepped] = await Promise.all([
            parser.getStringProperty("a.b.c").promise,
            parser.getMapProperty("a.b").promise.then((map) => map.c),
        ]);

        expect(direct).toBe("value");
        expect(stepped).toBe("value");
    });

    test("number precision bug", async () => {
        // Tests that numbers maintain precision
        const json = '{"value":0.1234567890123456789}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const value = await parser.getNumberProperty("value").promise;

        // JavaScript number precision limits apply
        expect(typeof value).toBe("number");
        expect(value).toBeCloseTo(0.1234567890123456789, 15);
    });

    test("empty string bug", async () => {
        // Tests handling of empty strings
        const json = '{"empty":"","notEmpty":"value"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const [empty, notEmpty] = await Promise.all([
            parser.getStringProperty("empty").promise,
            parser.getStringProperty("notEmpty").promise,
        ]);

        expect(empty).toBe("");
        expect(notEmpty).toBe("value");
    });
});
