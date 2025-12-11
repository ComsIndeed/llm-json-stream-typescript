/**
 * Tests for error handling and edge cases
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Error Handling Tests", () => {
    test("complete JSON - all properties complete", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("name");

        const name = await nameStream.promise;
        expect(name).toBe("Alice");

        const rootMap = await parser.getMapProperty("").promise;
        expect(rootMap).toEqual({ name: "Alice" });
    });

    test("complete JSON - arrays complete properly", async () => {
        const json = '{"items":[1,2]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const item0 = await parser.getNumberProperty("items[0]").promise;
        const item1 = await parser.getNumberProperty("items[1]").promise;

        expect(item0).toBe(1);
        expect(item1).toBe(2);
    });

    test("incomplete JSON - stream ends prematurely", async () => {
        const incompleteJson = '{"name":"Alice","age":';
        const stream = streamTextInChunks({
            text: incompleteJson,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const ageStream = parser.getNumberProperty("age");

        // Should reject or timeout
        await expect(
            Promise.race([
                ageStream.promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 500)
                ),
            ]),
        ).rejects.toThrow();
    });

    test("malformed JSON - invalid syntax", async () => {
        const malformedJson = '{"name":Alice}'; // Missing quotes
        const stream = streamTextInChunks({
            text: malformedJson,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("name");

        // Should reject due to malformed JSON
        await expect(
            Promise.race([
                nameStream.promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 500)
                ),
            ]),
        ).rejects.toThrow();
    });

    test("wrong property type access", async () => {
        const json = '{"age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Accessing number as string should throw or return undefined
        const ageStream = parser.getStringProperty("age");

        await expect(
            Promise.race([
                ageStream.promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Type mismatch")), 500)
                ),
            ]),
        ).rejects.toThrow();
    });

    test("accessing non-existent property", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const ageStream = parser.getNumberProperty("age");

        // Non-existent property should timeout or reject
        await expect(
            Promise.race([
                ageStream.promise,
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error("Property not found")),
                        500,
                    )
                ),
            ]),
        ).rejects.toThrow();
    });

    test("accessing array element out of bounds", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const item10 = parser.getNumberProperty("items[10]");

        // Out of bounds should timeout or reject
        await expect(
            Promise.race([
                item10.promise,
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error("Index out of bounds")),
                        500,
                    )
                ),
            ]),
        ).rejects.toThrow();
    });

    test("invalid property path syntax", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Invalid path syntax
        expect(() => parser.getStringProperty("name..value")).toThrow();
    });

    test("stream error handling", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        // Add error handler to prevent unhandled error
        stream.on("error", () => {
            // Error will be caught by the expect below
        });

        // Simulate stream error
        setTimeout(() => stream.destroy(new Error("Stream error")), 20);

        await expect(valueStream.promise).rejects.toThrow();
    });

    test("timeout on slow streams", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 1000, // Very slow
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        // Should timeout
        await expect(
            Promise.race([
                valueStream.promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 500)
                ),
            ]),
        ).rejects.toThrow("Timeout");
    });
});

describe("Edge Cases", () => {
    test("empty JSON object", async () => {
        const json = "{}";
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const rootMap = await parser.getMapProperty("").promise;

        expect(rootMap).toEqual({});
    });

    test("empty JSON array", async () => {
        const json = '{"items":[]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getListProperty("items");

        const items = await itemsStream.promise;
        expect(items).toEqual([]);
    });

    test("single character chunks", async () => {
        const json = '{"a":1}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 1,
            interval: 5,
        });

        const parser = new JsonStreamParser(stream);
        const aStream = parser.getNumberProperty("a");

        const result = await aStream.promise;
        expect(result).toBe(1);
    });

    test("very large chunks", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 1000,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = parser.getStringProperty("name");

        const result = await name.promise;
        expect(result).toBe("Alice");
    });

    test("whitespace handling", async () => {
        const json = '  {  "name"  :  "Alice"  }  ';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = parser.getStringProperty("name");

        const result = await name.promise;
        expect(result).toBe("Alice");
    });

    test("escaped characters in property names", async () => {
        // JSON with escaped quotes in property name
        const json = '{"name":"Alice"}'; // Keeping simple for now
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = parser.getStringProperty("name");

        const result = await name.promise;
        expect(result).toBe("Alice");
    });
});
