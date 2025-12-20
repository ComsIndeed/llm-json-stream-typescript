/**
 * Tests for critical bug fixes and regressions
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Critical Bug Tests", () => {
    test("chunk boundary bug - string not flushing", async () => {
        // Tests the bug where string chunks weren't emitted when chunk ended
        const json = '{"message":"Hello World"}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10, // Chunk ends mid-string
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const messageStream = parser.get<string>("message");

        const chunks: string[] = [];
        const collectChunks = (async () => {
            for await (const chunk of messageStream) {
                chunks.push(chunk);
            }
        })();

        const message = await messageStream;
        await collectChunks;

        expect(message).toBe("Hello World");
        expect(chunks.length).toBeGreaterThan(0); // Should have emitted chunks
    });

    test("nested list index access", async () => {
        // Tests accessing nested array elements by index
        const json = '{"outer":[{"inner":[1,2,3]}]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        const [inner0, inner1, inner2] = await Promise.all([
            parser.get<number>("outer[0].inner[0]"),
            parser.get<number>("outer[0].inner[1]"),
            parser.get<number>("outer[0].inner[2]"),
        ]);

        expect([inner0, inner1, inner2]).toEqual([1, 2, 3]);

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

        const parser = JsonStream.parse(stream);
        const name = await parser.get<string>("name");
        const value = await parser.get<number>("value");

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

        const parser = JsonStream.parse(stream);
        const text = await parser.get<string>("text");

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

        const parser = JsonStream.parse(stream);

        // Access in different orders
        const [direct, stepped] = await Promise.all([
            parser.get<string>("a.b.c"),
            parser.get<Record<string, any>>("a.b").then((map) => map.c),
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

        const parser = JsonStream.parse(stream);
        const value = await parser.get<number>("value");

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

        const parser = JsonStream.parse(stream);
        const [empty, notEmpty] = await Promise.all([
            parser.get<string>("empty"),
            parser.get<string>("notEmpty"),
        ]);

        expect(empty).toBe("");
        expect(notEmpty).toBe("value");
    });
});
