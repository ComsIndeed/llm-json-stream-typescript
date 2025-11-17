/**
 * Tests for buffer flushing behavior
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Buffer Flush Tests", () => {
    test("string buffer flushes on chunk boundary", async () => {
        const json = '{"text":"HelloWorld"}';
        // Chunk size of 3 will split the string value
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        const chunks: string[] = [];
        textStream.stream.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const result = await textStream.future;

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

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getStringProperty("value");

        const result = await valueStream.future;
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

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        const result = await textStream.future;
        expect(result).toBe("Hello\nWorld");
    });

    test("number split across chunks", async () => {
        const json = '{"number":12345}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const numberStream = parser.getNumberProperty("number");

        const result = await numberStream.future;
        expect(result).toBe(12345);
    });

    test("keyword (true/false/null) split across chunks", async () => {
        const json = '{"a":true,"b":false,"c":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const a = parser.getBooleanProperty("a");
        const b = parser.getBooleanProperty("b");
        const c = parser.getNullProperty("c");

        const [aVal, bVal, cVal] = await Promise.all([
            a.future,
            b.future,
            c.future,
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

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getStringProperty("longPropertyName");

        const result = await valueStream.future;
        expect(result).toBe("value");
    });

    test("multiple incomplete values buffered", async () => {
        const json = '{"a":"test1","b":"test2","c":"test3"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const a = parser.getStringProperty("a");
        const b = parser.getStringProperty("b");
        const c = parser.getStringProperty("c");

        const [aVal, bVal, cVal] = await Promise.all([
            a.future,
            b.future,
            c.future,
        ]);

        expect(aVal).toBe("test1");
        expect(bVal).toBe("test2");
        expect(cVal).toBe("test3");
    });
});
