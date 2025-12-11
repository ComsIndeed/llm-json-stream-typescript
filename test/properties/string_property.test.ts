/**
 * Tests for string property parsing and streaming
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../../src/utilities/stream_text_in_chunks.js";

describe("String Property Tests", () => {
    test("simple string value", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("name");

        // Accumulate stream chunks
        const chunks: string[] = [];
        nameStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const finalValue = await nameStream.promise;

        // Verify accumulated chunks form the complete value
        expect(chunks.join("")).toBe("Alice");
        expect(finalValue).toBe("Alice");
    });

    test("string with escape sequences - newline", async () => {
        const json = '{"text":"Hello\\nWorld"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        const chunks: string[] = [];
        textStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const finalValue = await textStream.promise;

        expect(chunks.join("")).toBe("Hello\nWorld");
        expect(finalValue).toBe("Hello\nWorld");
    });

    test("string with escape sequences - tab", async () => {
        const json = '{"text":"Hello\\tWorld"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        const finalValue = await textStream.promise;
        expect(finalValue).toBe("Hello\tWorld");
    });

    test("string with escape sequences - quotes", async () => {
        const json = '{"text":"She said \\"Hello\\""}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        const finalValue = await textStream.promise;
        expect(finalValue).toBe('She said "Hello"');
    });

    test("string with escape sequences - backslash", async () => {
        const json = '{"path":"C:\\\\Users\\\\Name"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const pathStream = parser.getStringProperty("path");

        const finalValue = await pathStream.promise;
        expect(finalValue).toBe("C:\\Users\\Name");
    });

    test("empty string", async () => {
        const json = '{"value":""}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getStringProperty("value");

        const finalValue = await valueStream.promise;
        expect(finalValue).toBe("");
    });

    test("string with unicode characters", async () => {
        const json = '{"emoji":"Hello 👋 World 🌍"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const emojiStream = parser.getStringProperty("emoji");

        const finalValue = await emojiStream.promise;
        expect(finalValue).toBe("Hello 👋 World 🌍");
    });

    test("long string chunked across multiple stream chunks", async () => {
        const longText =
            "This is a very long string that will definitely be split across multiple chunks when streamed";
        const json = `{"description":"${longText}"}`;
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 5,
        });

        const parser = new JsonStreamParser(stream);
        const descStream = parser.getStringProperty("description");

        const chunks: string[] = [];
        descStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const finalValue = await descStream.promise;

        // Should have received multiple chunks
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.join("")).toBe(longText);
        expect(finalValue).toBe(longText);
    });

    test("string property streaming - multiple chunks", async () => {
        const json = '{"title":"My Great Blog Post"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const titleStream = parser.getStringProperty("title");

        const chunks: string[] = [];
        titleStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const finalValue = await titleStream.promise;

        // The string should be emitted in chunks as it's parsed
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.join("")).toBe("My Great Blog Post");
        expect(finalValue).toBe("My Great Blog Post");
    });

    test("nested string property", async () => {
        const json = '{"user":{"name":"Bob"}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("user.name");

        const finalValue = await nameStream.promise;
        expect(finalValue).toBe("Bob");
    });

    test("async iterator pattern with for await...of", async () => {
        const json = '{"message":"Hello World from LLM"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const messageStream = parser.getStringProperty("message");

        // Accumulate chunks using modern async iterator
        const chunks: string[] = [];
        for await (const chunk of messageStream) {
            chunks.push(chunk);
        }

        // Verify accumulated chunks form the complete value
        const result = chunks.join("");
        expect(result).toBe("Hello World from LLM");
        expect(chunks.length).toBeGreaterThan(1); // Ensure we got multiple chunks
    });

    test("async iterator with non-streaming types", async () => {
        const json = '{"count":42,"active":true,"value":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Number type
        const countStream = parser.getNumberProperty("count");
        const countChunks: string[] = [];
        for await (const chunk of countStream) {
            countChunks.push(chunk);
        }
        expect(countChunks).toEqual(["42"]);

        // Boolean type
        const activeStream = parser.getBooleanProperty("active");
        const activeChunks: string[] = [];
        for await (const chunk of activeStream) {
            activeChunks.push(chunk);
        }
        expect(activeChunks).toEqual(["true"]);

        // Null type
        const valueStream = parser.getNullProperty("value");
        const valueChunks: string[] = [];
        for await (const chunk of valueStream) {
            valueChunks.push(chunk);
        }
        expect(valueChunks).toEqual(["null"]);
    });
});
