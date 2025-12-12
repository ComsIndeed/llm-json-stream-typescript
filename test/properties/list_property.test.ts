/**
 * Tests for list/array property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Lists emit SNAPSHOTS as elements complete.
 * Each emission contains the current state of the array.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../../src/utilities/stream_text_in_chunks.js";

describe("List Property Tests", () => {
    test("simple array of numbers", async () => {
        const json = '{"numbers":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const numbersStream = parser.getArrayProperty("numbers");

        const finalValue = await numbersStream.promise;
        expect(finalValue).toEqual([1, 2, 3]);
    });

    test("empty array", async () => {
        const json = '{"items":[]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getArrayProperty("items");

        const finalValue = await itemsStream.promise;
        expect(finalValue).toEqual([]);
    });

    test("array of strings", async () => {
        const json = '{"names":["Alice","Bob","Charlie"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const namesStream = parser.getArrayProperty("names");

        const finalValue = await namesStream.promise;
        expect(finalValue).toEqual(["Alice", "Bob", "Charlie"]);
    });

    test("array of objects", async () => {
        const json = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const usersStream = parser.getArrayProperty("users");

        const finalValue = await usersStream.promise;
        expect(finalValue).toEqual([{ name: "Alice" }, { name: "Bob" }]);
    });

    test("nested arrays", async () => {
        const json = '{"matrix":[[1,2],[3,4]]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const matrixStream = parser.getArrayProperty("matrix");

        const finalValue = await matrixStream.promise;
        expect(finalValue).toEqual([[1, 2], [3, 4]]);
    });

    test("mixed type array", async () => {
        const json = '{"mixed":[1,"text",true,null]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const mixedStream = parser.getArrayProperty("mixed");

        const finalValue = await mixedStream.promise;
        expect(finalValue).toEqual([1, "text", true, null]);
    });

    test("array element access by index", async () => {
        const json = '{"items":["first","second","third"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 9,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const item0 = parser.getStringProperty("items[0]");
        const item1 = parser.getStringProperty("items[1]");
        const item2 = parser.getStringProperty("items[2]");

        const [val0, val1, val2] = await Promise.all([
            item0.promise,
            item1.promise,
            item2.promise,
        ]);

        expect(val0).toBe("first");
        expect(val1).toBe("second");
        expect(val2).toBe("third");
    });

    test("onElement callback fires for each element", async () => {
        const json = '{"items":[1,2,3,4,5]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getArrayProperty("items");

        const callbackFired: number[] = [];
        itemsStream.onElement((element, index) => {
            callbackFired.push(index);
        });

        await itemsStream.promise;

        expect(callbackFired).toEqual([0, 1, 2, 3, 4]);
    });

    test("onElement callback receives correct index", async () => {
        const json = '{"data":["a","b","c"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const dataStream = parser.getArrayProperty("data");

        const indices: number[] = [];
        dataStream.onElement((element, index) => {
            indices.push(index);
        });

        await dataStream.promise;

        expect(indices).toEqual([0, 1, 2]);
    });

    test("accessing properties of array elements", async () => {
        const json =
            '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const user0Name = parser.getStringProperty("users[0].name");
        const user1Name = parser.getStringProperty("users[1].name");

        const [name0, name1] = await Promise.all([
            user0Name.promise,
            user1Name.promise,
        ]);

        expect(name0).toBe("Alice");
        expect(name1).toBe("Bob");
    });

    test("deeply nested list structures", async () => {
        const json = '{"level1":[{"level2":[{"level3":[1,2,3]}]}]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const deepArray = parser.getArrayProperty("level1[0].level2[0].level3");

        const finalValue = await deepArray.promise;
        expect(finalValue).toEqual([1, 2, 3]);
    });

    test("large array performance", async () => {
        const numbers = Array.from({ length: 100 }, (_, i) => i);
        const json = `{"numbers":${JSON.stringify(numbers)}}`;
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 20,
            interval: 0, // No delay for performance test
        });

        const parser = new JsonStreamParser(stream);
        const numbersStream = parser.getArrayProperty("numbers");

        const finalValue = await numbersStream.promise;
        expect(finalValue).toEqual(numbers);
        expect(finalValue.length).toBe(100);
    });

    test("async iterator emits list snapshots", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getArrayProperty("items");

        // Collect all snapshots using async iterator
        const snapshots: any[][] = [];
        for await (const snapshot of itemsStream) {
            snapshots.push([...snapshot]); // Copy to preserve state
        }

        // Should have received incremental snapshots
        // Final snapshot should have all elements
        expect(snapshots.length).toBeGreaterThan(0);
        expect(snapshots[snapshots.length - 1]).toEqual([1, 2, 3]);
    });
});

