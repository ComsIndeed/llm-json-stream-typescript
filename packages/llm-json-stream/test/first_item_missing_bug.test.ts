/**
 * Test case for the "first item missing" bug when using proxy-based syntax
 *
 * Bug description:
 * When using the proxy-based syntax (article.features) for iterating over arrays
 * with for-await, the first item is sometimes missing because:
 * 1. The iterator is created lazily when [Symbol.asyncIterator]() is called
 * 2. The onElement callback is registered at that point
 * 3. By the time the callback is registered, the first element(s) may have already been notified
 * 4. Since ArrayPropertyStream doesn't buffer element notifications, they are lost
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("First Item Missing Bug", () => {
    test("BUG REPRODUCTION: proxy-based array iteration misses first item when parsing is fast", async () => {
        const json = JSON.stringify({
            features: [
                "first item",
                "second item",
                "third item",
                "fourth item",
                "fifth item",
            ],
        });

        // Use larger chunks to make parsing faster than callback registration
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100, // Large chunk - all data arrives quickly
            interval: 0, // No delay
        });

        interface Data {
            features: string[];
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        // This is the problematic pattern - for await on proxy-based path
        const items: string[] = [];
        for await (const itemAsync of paths.features) {
            const item = await itemAsync;
            items.push(item);
        }

        // The bug: first item(s) may be missing!
        expect(items.length).toBe(5);
        expect(items).toEqual([
            "first item",
            "second item",
            "third item",
            "fourth item",
            "fifth item",
        ]);
    });

    test("BUG REPRODUCTION: direct get() array iteration also misses items with fast parsing", async () => {
        const json = JSON.stringify({
            features: ["one", "two", "three"],
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        const jsonStream = JsonStream.parse(stream);
        const featuresAsync = jsonStream.get<string[]>("features");

        const items: string[] = [];
        for await (const itemAsync of featuresAsync) {
            const item = await itemAsync;
            items.push(item);
        }

        expect(items.length).toBe(3);
        expect(items).toEqual(["one", "two", "three"]);
    });

    test("BUG REPRODUCTION: nested array access with proxy paths", async () => {
        const json = JSON.stringify({
            data: {
                items: ["a", "b", "c"],
            },
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        interface Data {
            data: {
                items: string[];
            };
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.data.items) {
            const item = await itemAsync;
            items.push(item);
        }

        expect(items.length).toBe(3);
        expect(items).toEqual(["a", "b", "c"]);
    });

    test("BASELINE: slow streaming should still work (gives time for callback registration)", async () => {
        const json = JSON.stringify({
            features: ["first", "second", "third"],
        });

        // Very small chunks and slow - should always work
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 1, // Tiny chunks
            interval: 10, // Slow streaming
        });

        interface Data {
            features: string[];
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.features) {
            const item = await itemAsync;
            items.push(item);
        }

        // With slow streaming, all items should be captured
        expect(items.length).toBe(3);
        expect(items).toEqual(["first", "second", "third"]);
    });

    test("COMPARISON: awaiting the array value directly works correctly", async () => {
        const json = JSON.stringify({
            features: ["one", "two", "three"],
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        interface Data {
            features: string[];
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        // Awaiting the full value works - no iteration
        const features = await paths.features;

        expect(features.length).toBe(3);
        expect(features).toEqual(["one", "two", "three"]);
    });

    test("COMPARISON: index-based access works correctly", async () => {
        const json = JSON.stringify({
            features: ["one", "two", "three"],
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        interface Data {
            features: string[];
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        // Index-based access should work
        const [first, second, third] = await Promise.all([
            paths.features[0],
            paths.features[1],
            paths.features[2],
        ]);

        expect(first).toBe("one");
        expect(second).toBe("two");
        expect(third).toBe("three");
    });

    test("BUG REPRODUCTION: array iteration via $asAsyncJson", async () => {
        const json = JSON.stringify({
            items: ["x", "y", "z"],
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        interface Data {
            items: string[];
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        // Using $asAsyncJson() to get the AsyncJson
        const itemsAsyncJson = paths.items.$asAsyncJson();

        const items: string[] = [];
        for await (const itemAsync of itemsAsyncJson) {
            const item = await itemAsync;
            items.push(item);
        }

        expect(items.length).toBe(3);
        expect(items).toEqual(["x", "y", "z"]);
    });

    test("BUG REPRODUCTION: array iteration via asyncJson()", async () => {
        const json = JSON.stringify({
            items: ["x", "y", "z"],
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        interface Data {
            items: string[];
        }

        const jsonStream = JsonStream.parse<Data>(stream);
        const paths = jsonStream.paths();

        // Using asyncJson() to get the AsyncJson
        const itemsAsyncJson = paths.items.asyncJson();

        const items: string[] = [];
        for await (const itemAsync of itemsAsyncJson) {
            const item = await itemAsync;
            items.push(item);
        }

        expect(items.length).toBe(3);
        expect(items).toEqual(["x", "y", "z"]);
    });

    test("BUG REPRODUCTION: multiple for-await iterations on same array", async () => {
        const json = JSON.stringify({
            items: ["a", "b", "c"],
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });

        const jsonStream = JsonStream.parse<{ items: string[] }>(stream);
        const itemsAsync = jsonStream.get<string[]>("items");

        // First iteration
        const items1: string[] = [];
        for await (const itemAsync of itemsAsync) {
            const item = await itemAsync;
            items1.push(item);
        }

        // Second iteration (should work with buffering)
        const items2: string[] = [];
        for await (const itemAsync of itemsAsync) {
            const item = await itemAsync;
            items2.push(item);
        }

        expect(items1).toEqual(["a", "b", "c"]);
        expect(items2).toEqual(["a", "b", "c"]);
    });
});

describe("Comprehensive Array Iteration Tests - All Access Methods", () => {
    const testJson = {
        simpleArray: ["first", "second", "third"],
        nestedArray: {
            items: ["a", "b", "c"],
        },
        arrayOfObjects: [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
        ],
    };

    const jsonString = JSON.stringify(testJson);

    async function createParser() {
        const stream = streamTextInChunks({
            text: jsonString,
            chunkSize: 50,
            interval: 0,
        });
        return JsonStream.parse<typeof testJson>(stream);
    }

    test("Method 1: get<T[]>(path) with for-await", async () => {
        const parser = await createParser();
        const arrayAsync = parser.get<string[]>("simpleArray");

        const items: string[] = [];
        for await (const itemAsync of arrayAsync) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["first", "second", "third"]);
    });

    test("Method 2: paths().property with for-await", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.simpleArray) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["first", "second", "third"]);
    });

    test("Method 3: paths().nested.property with for-await", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.nestedArray.items) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["a", "b", "c"]);
    });

    test("Method 4: paths().property.$asAsyncJson() with for-await", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.simpleArray.$asAsyncJson()) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["first", "second", "third"]);
    });

    test("Method 5: paths().property.asyncJson() with for-await", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.simpleArray.asyncJson()) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["first", "second", "third"]);
    });

    test("Method 6: get<T[]>(path).unbuffered() with for-await", async () => {
        const parser = await createParser();
        const arrayAsync = parser.get<string[]>("simpleArray");

        const items: string[] = [];
        for await (const itemAsync of arrayAsync.unbuffered()) {
            items.push(await itemAsync);
        }

        // Note: unbuffered may miss items if parsing is faster than iteration
        // This test documents the behavior
        expect(items.length).toBeLessThanOrEqual(3);
    });

    test("Method 7: chained get() after paths()", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        // Get nestedArray via paths, then use get() for inner property
        const items: string[] = [];
        for await (
            const itemAsync of paths.nestedArray.get<string[]>("items")
        ) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["a", "b", "c"]);
    });

    test("Method 8: $get() on paths", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        const items: string[] = [];
        for await (const itemAsync of paths.$get<string[]>("simpleArray")) {
            items.push(await itemAsync);
        }

        expect(items).toEqual(["first", "second", "third"]);
    });

    test("Method 9: Iteration over array of objects, accessing properties", async () => {
        const parser = await createParser();
        const paths = parser.paths();

        const results: Array<{ id: number; name: string }> = [];
        for await (const objAsync of paths.arrayOfObjects) {
            const id = await objAsync.get<number>("id");
            const name = await objAsync.get<string>("name");
            results.push({ id, name });
        }

        expect(results).toEqual([
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
        ]);
    });

    test("Method 10: Await full array value", async () => {
        const parser = await createParser();

        // Using get()
        const arr1 = await parser.get<string[]>("simpleArray");
        expect(arr1).toEqual(["first", "second", "third"]);

        // Using paths()
        const paths = parser.paths();
        const arr2 = await paths.simpleArray;
        expect(arr2).toEqual(["first", "second", "third"]);
    });
});
