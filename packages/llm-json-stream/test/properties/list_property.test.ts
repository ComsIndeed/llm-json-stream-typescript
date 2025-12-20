/**
 * Tests for list/array property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Lists emit SNAPSHOTS as elements complete.
 * Each emission contains the current state of the array.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../../src/index.js";

describe("List Property Tests", () => {
    test("simple array of numbers", async () => {
        const json = '{"numbers":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const numbersStream = parser.get<any[]>("numbers");

        const finalValue = await numbersStream;
        expect(finalValue).toEqual([1, 2, 3]);
    });

    test("empty array", async () => {
        const json = '{"items":[]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const itemsStream = parser.get<any[]>("items");

        const finalValue = await itemsStream;
        expect(finalValue).toEqual([]);
    });

    test("array of strings", async () => {
        const json = '{"names":["Alice","Bob","Charlie"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const namesStream = parser.get<any[]>("names");

        const finalValue = await namesStream;
        expect(finalValue).toEqual(["Alice", "Bob", "Charlie"]);
    });

    test("array of objects", async () => {
        const json = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const usersStream = parser.get<any[]>("users");

        const finalValue = await usersStream;
        expect(finalValue).toEqual([{ name: "Alice" }, { name: "Bob" }]);
    });

    test("nested arrays", async () => {
        const json = '{"matrix":[[1,2],[3,4]]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const matrixStream = parser.get<any[]>("matrix");

        const finalValue = await matrixStream;
        expect(finalValue).toEqual([[1, 2], [3, 4]]);
    });

    test("mixed type array", async () => {
        const json = '{"mixed":[1,"text",true,null]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const mixedStream = parser.get<any[]>("mixed");

        const finalValue = await mixedStream;
        expect(finalValue).toEqual([1, "text", true, null]);
    });

    test("array element access by index", async () => {
        const json = '{"items":["first","second","third"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 9,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const item0 = parser.get<string>("items[0]");
        const item1 = parser.get<string>("items[1]");
        const item2 = parser.get<string>("items[2]");

        const [val0, val1, val2] = await Promise.all([
            item0,
            item1,
            item2,
        ]);

        expect(val0).toBe("first");
        expect(val1).toBe("second");
        expect(val2).toBe("third");
    });

    test("array iteration with for await yields AsyncJson per element", async () => {
        const json = '{"items":[1,2,3,4,5]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const itemsStream = parser.get<number[]>("items");

        const items: number[] = [];
        // Now iteration yields AsyncJson<E> for each element
        for await (const itemAsync of itemsStream) {
            const item = await itemAsync;
            items.push(item);
        }

        // Should have collected all items
        expect(items).toEqual([1, 2, 3, 4, 5]);
    });

    test("array elements accessible by index", async () => {
        const json = '{"data":["a","b","c"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        const [el0, el1, el2] = await Promise.all([
            parser.get<string>("data[0]"),
            parser.get<string>("data[1]"),
            parser.get<string>("data[2]"),
        ]);

        expect(el0).toBe("a");
        expect(el1).toBe("b");
        expect(el2).toBe("c");
    });

    test("accessing properties of array elements", async () => {
        const json =
            '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const user0Name = parser.get<string>("users[0].name");
        const user1Name = parser.get<string>("users[1].name");

        const [name0, name1] = await Promise.all([
            user0Name,
            user1Name,
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

        const parser = JsonStream.parse(stream);
        const deepArray = parser.get<any[]>("level1[0].level2[0].level3");

        const finalValue = await deepArray;
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

        const parser = JsonStream.parse(stream);
        const numbersStream = parser.get<any[]>("numbers");

        const finalValue = await numbersStream;
        expect(finalValue).toEqual(numbers);
        expect(finalValue.length).toBe(100);
    });

    test("async iterator yields AsyncJson per element", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const itemsStream = parser.get<number[]>("items");

        // Now iteration yields AsyncJson<E> for each element
        const items: number[] = [];
        for await (const itemAsync of itemsStream) {
            const item = await itemAsync;
            items.push(item);
        }

        // Should have collected all elements
        expect(items).toEqual([1, 2, 3]);
    });
});
