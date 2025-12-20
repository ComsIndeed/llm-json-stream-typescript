import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Incremental Updates", () => {
    test("String via promise returns complete value", async () => {
        const stream = streamTextInChunks({
            text: '{"name":"Alice"}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const stringStream = parser.get<string>("name");
        const complete = await stringStream;

        expect(complete).toBe("Alice");
    });

    test("String emits chunks via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"message":"Hello World, this is a longer string!"}',
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const stringStream = parser.get<string>("message");
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
        const parser = JsonStream.parse(stream);

        const mapStream = parser.get<Record<string, any>>("");
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

    test("List emits AsyncJson<E> for each element", async () => {
        const stream = streamTextInChunks({
            text: '{"items":[1,2,3,4,5]}',
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const listStream = parser.get<number[]>("items");
        const emittedItems: number[] = [];

        // Now iterating yields AsyncJson<E> for each element
        for await (const itemAsync of listStream) {
            const item = await itemAsync;
            emittedItems.push(item);
        }

        // Should have collected all 5 elements
        expect(emittedItems.length).toBe(5);
        expect(emittedItems).toEqual([1, 2, 3, 4, 5]);
    });

    test("Nested objects resolve correctly", async () => {
        const stream = streamTextInChunks({
            text: '{"user":{"name":"Bob","profile":{"city":"NYC"}}}',
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        // Get streams for nested properties
        const userStream = parser.get<Record<string, any>>("user");
        const nameStream = parser.get<string>("user.name");
        const cityStream = parser.get<string>("user.profile.city");

        // All should resolve with correct values
        const [user, name, city] = await Promise.all([
            userStream,
            nameStream,
            cityStream,
        ]);

        expect(name).toBe("Bob");
        expect(city).toBe("NYC");
        expect(user).toEqual({ name: "Bob", profile: { city: "NYC" } });
    });

    test("Array elements accessible via index", async () => {
        const stream = streamTextInChunks({
            text: '{"numbers":[10,20,30,40,50]}',
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const [n0, n1, n2, n3, n4] = await Promise.all([
            parser.get<number>("numbers[0]"),
            parser.get<number>("numbers[1]"),
            parser.get<number>("numbers[2]"),
            parser.get<number>("numbers[3]"),
            parser.get<number>("numbers[4]"),
        ]);

        expect([n0, n1, n2, n3, n4]).toEqual([10, 20, 30, 40, 50]);
    });

    test("Atomic values emit once via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"count":42}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const numberStream = parser.get<number>("count");
        const numberEmissions: any[] = [];

        for await (const v of numberStream) {
            numberEmissions.push(v);
        }

        // Atomic values emit exactly once (the actual value)
        expect(numberEmissions).toEqual([42]);

        // Promise returns the actual typed value
        expect(await numberStream).toBe(42);
    });

    test("Boolean values emit once via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"active":true}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const boolStream = parser.get<boolean>("active");
        const boolEmissions: any[] = [];

        for await (const v of boolStream) {
            boolEmissions.push(v);
        }

        expect(boolEmissions).toEqual([true]);
        expect(await boolStream).toBe(true);
    });

    test("Null values emit once via async iterator", async () => {
        const stream = streamTextInChunks({
            text: '{"data":null}',
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const nullStream = parser.get<null>("data");
        const nullEmissions: any[] = [];

        for await (const v of nullStream) {
            nullEmissions.push(v);
        }

        expect(nullEmissions).toEqual([null]);
        expect(await nullStream).toBe(null);
    });

    test("Late subscription still gets value via promise", async () => {
        const stream = streamTextInChunks({
            text: '{"title":"Hello World"}',
            chunkSize: 100, // Large chunk to parse all at once
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        // Wait a bit for parsing to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Now subscribe - should still get the value
        const titleStream = parser.get<string>("title");
        const value = await titleStream;

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
        const parser = JsonStream.parse(stream);

        const contentStream = parser.get<string>("content");
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
        const parser = JsonStream.parse(stream);

        const emptyStream = parser.get<string>("empty");
        const value = await emptyStream;

        expect(value).toBe("");
    });
});
