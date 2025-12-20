/**
 * Tests for debugging nested list behaviors
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Debug Nested List Tests", () => {
    test("simple nested array", async () => {
        const json = '{"list":[[1,2],[3,4]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const list = await parser.get<any[]>("list");

        expect(list).toEqual([[1, 2], [3, 4]]);
    });

    test("deeply nested arrays", async () => {
        const json = '{"deep":[[[1,2],[3,4]],[[5,6],[7,8]]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const deep = await parser.get<any[]>("deep");

        expect(deep).toEqual([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
    });

    test("array of objects with arrays", async () => {
        const json = '{"data":[{"items":[1,2]},{"items":[3,4]}]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const data = await parser.get<any[]>("data");

        expect(data).toEqual([
            { items: [1, 2] },
            { items: [3, 4] },
        ]);
    });

    test("nested arrays accessible by index", async () => {
        const json = '{"outer":[["a","b"],["c","d"]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        const [arr0, arr1] = await Promise.all([
            parser.get<string[]>("outer[0]"),
            parser.get<string[]>("outer[1]"),
        ]);

        expect(arr0).toEqual(["a", "b"]);
        expect(arr1).toEqual(["c", "d"]);
    });

    test("accessing elements in nested arrays", async () => {
        const json = '{"matrix":[[1,2,3],[4,5,6],[7,8,9]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        const [row0, row1, row2] = await Promise.all([
            parser.get<any[]>("matrix[0]"),
            parser.get<any[]>("matrix[1]"),
            parser.get<any[]>("matrix[2]"),
        ]);

        expect(row0).toEqual([1, 2, 3]);
        expect(row1).toEqual([4, 5, 6]);
        expect(row2).toEqual([7, 8, 9]);
    });

    test("complex nested structure traversal", async () => {
        const json =
            '{"users":[{"name":"Alice","tags":["admin","user"]},{"name":"Bob","tags":["user"]}]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 20,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);

        const [aliceTags, bobTags] = await Promise.all([
            parser.get<any[]>("users[0].tags"),
            parser.get<any[]>("users[1].tags"),
        ]);

        expect(aliceTags).toEqual(["admin", "user"]);
        expect(bobTags).toEqual(["user"]);
    });

    test("empty nested arrays", async () => {
        const json = '{"lists":[[],[],[]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const lists = await parser.get<any[]>("lists");

        expect(lists).toEqual([[], [], []]);
    });

    test("nested array with mixed types", async () => {
        const json = '{"mixed":[[1,"two",true],[null,4.5,false]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const mixed = await parser.get<any[]>("mixed");

        expect(mixed).toEqual([[1, "two", true], [null, 4.5, false]]);
    });
});
