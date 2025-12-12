import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Incremental Updates", () => {
    test("String via promise returns complete value", async () => {
        const stream = streamTextInChunks({
            text: '{"name":"Alice"}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const stringStream = parser.getStringProperty("name");
        const complete = await stringStream.promise;

        expect(complete).toBe("Alice");
    });

    test("String emits chunks via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"message":"Hello World, this is a longer string!"}',
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const stringStream = parser.getStringProperty("message");
        const emittedStrings: string[] = [];

        for await (const chunk of stringStream) {
            emittedStrings.push(chunk);
        }

        // Should emit chunks
        expect(emittedStrings.length).toBeGreaterThanOrEqual(1);
        // Concatenated chunks should equal the full string
        expect(emittedStrings.join("")).toBe(
            "Hello World, this is a longer string!",
        );
    });

    test("Map emits incremental snapshots", async () => {
        const stream = streamTextInChunks({
            text: '{"name":"Alice","age":30,"active":true}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mapStream = parser.getObjectProperty("");
        const emittedMaps: Record<string, any>[] = [];

        for await (const snapshot of mapStream) {
            emittedMaps.push({ ...snapshot });
        }

        // Should emit at least one snapshot
        expect(emittedMaps.length).toBeGreaterThanOrEqual(1);

        // Final snapshot should have all properties
        const finalSnapshot = emittedMaps[emittedMaps.length - 1];
        expect(finalSnapshot).toEqual({ name: "Alice", age: 30, active: true });
    });

    test("List emits incremental snapshots", async () => {
        const stream = streamTextInChunks({
            text: '{"items":[1,2,3,4,5]}',
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const listStream = parser.getArrayProperty("items");
        const emittedLists: any[][] = [];

        for await (const snapshot of listStream) {
            emittedLists.push([...snapshot]);
        }

        // Should emit at least one snapshot
        expect(emittedLists.length).toBeGreaterThanOrEqual(1);

        // Final snapshot should have all elements
        const finalSnapshot = emittedLists[emittedLists.length - 1];
        expect(finalSnapshot).toEqual([1, 2, 3, 4, 5]);
    });

    test("Nested objects resolve correctly", async () => {
        const stream = streamTextInChunks({
            text: '{"user":{"name":"Bob","profile":{"city":"NYC"}}}',
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        // Get streams for nested properties
        const userStream = parser.getObjectProperty("user");
        const nameStream = parser.getStringProperty("user.name");
        const cityStream = parser.getStringProperty("user.profile.city");

        // All should resolve with correct values
        const [user, name, city] = await Promise.all([
            userStream.promise,
            nameStream.promise,
            cityStream.promise,
        ]);

        expect(name).toBe("Bob");
        expect(city).toBe("NYC");
        expect(user).toEqual({ name: "Bob", profile: { city: "NYC" } });
    });

    test("Array elements accessible via onElement", async () => {
        const stream = streamTextInChunks({
            text: '{"numbers":[10,20,30,40,50]}',
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const listStream = parser.getArrayProperty("numbers");
        const elements: number[] = [];
        const indices: number[] = [];

        listStream.onElement(async (elementStream, index) => {
            const value = await elementStream.promise;
            elements.push(value as number);
            indices.push(index);
        });

        await listStream.promise;

        expect(elements).toEqual([10, 20, 30, 40, 50]);
        expect(indices).toEqual([0, 1, 2, 3, 4]);
    });

    test("Atomic values emit once via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"count":42}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const numberStream = parser.getNumberProperty("count");
        const numberEmissions: any[] = [];

        for await (const v of numberStream) {
            numberEmissions.push(v);
        }

        // Atomic values emit exactly once (the actual value)
        expect(numberEmissions).toEqual([42]);

        // Promise returns the actual typed value
        expect(await numberStream.promise).toBe(42);
    });

    test("Boolean values emit once via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"active":true}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const boolStream = parser.getBooleanProperty("active");
        const boolEmissions: any[] = [];

        for await (const v of boolStream) {
            boolEmissions.push(v);
        }

        expect(boolEmissions).toEqual([true]);
        expect(await boolStream.promise).toBe(true);
    });

    test("Null values emit once via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"data":null}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const nullStream = parser.getNullProperty("data");
        const nullEmissions: any[] = [];

        for await (const v of nullStream) {
            nullEmissions.push(v);
        }

        expect(nullEmissions).toEqual([null]);
        expect(await nullStream.promise).toBe(null);
    });

    test("Late subscription still gets value via promise", async () => {
        const stream = streamTextInChunks({
            text: '{"title":"Hello World"}',
            chunkSize: 100, // Large chunk to parse all at once
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        // Wait a bit for parsing to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Now subscribe - should still get the value
        const titleStream = parser.getStringProperty("title");
        const value = await titleStream.promise;

        expect(value).toBe("Hello World");
    });
});

describe("Incremental Updates - Streaming Strings", () => {
    test("String chunks are emitted progressively", async () => {
        const longText =
            "This is a very long string that should be streamed in multiple chunks";
        const stream = streamTextInChunks({
            text: `{"content":"${longText}"}`,
            chunkSize: 15,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const contentStream = parser.getStringProperty("content");
        const chunks: string[] = [];

        for await (const chunk of contentStream) {
            chunks.push(chunk);
        }

        // Should have received chunks
        expect(chunks.length).toBeGreaterThanOrEqual(1);

        // Concatenated chunks should equal the full string
        expect(chunks.join("")).toBe(longText);
    });

    test("Empty string emits correctly", async () => {
        const stream = streamTextInChunks({
            text: '{"empty":""}',
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const emptyStream = parser.getStringProperty("empty");
        const value = await emptyStream.promise;

        expect(value).toBe("");
    });
});

