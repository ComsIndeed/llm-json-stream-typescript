/**
 * Tests for buffer flushing behavior
 * Uses async iterators as the primary streaming interface.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";


describe("Buffer Flush Tests", () => {
    test("string buffer flushes on chunk boundary", async () => {
        const json = '{"text":"HelloWorld"}';
        // Chunk size of 3 will split the string value
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const textStream = parser.get<string>("text");

        const chunks: string[] = [];
        for await (const chunk of textStream) {
            chunks.push(chunk);
        }

        const result = await textStream;

        expect(result).toBe("HelloWorld");
        // Should have received multiple chunks
        expect(chunks.length).toBeGreaterThan(1);
    });

    test("incomplete value at chunk end is buffered", async () => {
        const json = '{"value":"test"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<string>("value");

        const result = await valueStream;
        expect(result).toBe("test");
    });

    test("escape sequence split across chunks", async () => {
        const json = '{"text":"Hello\\nWorld"}';
        // Make sure \\n gets split across chunks
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12, // This should split at the escape sequence
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const textStream = parser.get<string>("text");

        const result = await textStream;
        expect(result).toBe("Hello\nWorld");
    });

    test("number split across chunks", async () => {
        const json = '{"number":12345}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const numberStream = parser.get<number>("number");

        const result = await numberStream;
        expect(result).toBe(12345);
    });

    test("keyword (true/false/null) split across chunks", async () => {
        const json = '{"a":true,"b":false,"c":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const a = parser.get<boolean>("a");
        const b = parser.get<boolean>("b");
        const c = parser.get<null>("c");

        const [aVal, bVal, cVal] = await Promise.all([
            a,
            b,
            c,
        ]);

        expect(aVal).toBe(true);
        expect(bVal).toBe(false);
        expect(cVal).toBeNull();
    });

    test("property name split across chunks", async () => {
        const json = '{"longPropertyName":"value"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<string>("longPropertyName");

        const result = await valueStream;
        expect(result).toBe("value");
    });

    test("multiple incomplete values buffered", async () => {
        const json = '{"a":"test1","b":"test2","c":"test3"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const a = parser.get<string>("a");
        const b = parser.get<string>("b");
        const c = parser.get<string>("c");

        const [aVal, bVal, cVal] = await Promise.all([
            a,
            b,
            c,
        ]);

        expect(aVal).toBe("test1");
        expect(bVal).toBe("test2");
        expect(cVal).toBe("test3");
    });
});

