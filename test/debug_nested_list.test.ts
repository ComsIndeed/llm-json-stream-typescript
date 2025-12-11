/**
 * Tests for debugging nested list behaviors
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Debug Nested List Tests", () => {
    test("simple nested array", async () => {
        const json = '{"list":[[1,2],[3,4]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const list = await parser.getListProperty("list").promise;

        expect(list).toEqual([[1, 2], [3, 4]]);
    });

    test("deeply nested arrays", async () => {
        const json = '{"deep":[[[1,2],[3,4]],[[5,6],[7,8]]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const deep = await parser.getListProperty("deep").promise;

        expect(deep).toEqual([[[1, 2], [3, 4]], [[5, 6], [7, 8]]]);
    });

    test("array of objects with arrays", async () => {
        const json = '{"data":[{"items":[1,2]},{"items":[3,4]}]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const data = await parser.getListProperty("data").promise;

        expect(data).toEqual([
            { items: [1, 2] },
            { items: [3, 4] },
        ]);
    });

    test("onElement callbacks for nested arrays", async () => {
        const json = '{"outer":[["a","b"],["c","d"]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const outerStream = parser.getListProperty("outer");

        const innerArrays: string[][] = [];

        outerStream.onElement((element, index) => {
            innerArrays.push(element as unknown as string[]);
        });

        await outerStream.promise;

        expect(innerArrays).toEqual([["a", "b"], ["c", "d"]]);
    });

    test("accessing elements in nested arrays", async () => {
        const json = '{"matrix":[[1,2,3],[4,5,6],[7,8,9]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        const [row0, row1, row2] = await Promise.all([
            parser.getListProperty("matrix[0]").promise,
            parser.getListProperty("matrix[1]").promise,
            parser.getListProperty("matrix[2]").promise,
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

        const parser = new JsonStreamParser(stream);

        const [aliceTags, bobTags] = await Promise.all([
            parser.getListProperty("users[0].tags").promise,
            parser.getListProperty("users[1].tags").promise,
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

        const parser = new JsonStreamParser(stream);
        const lists = await parser.getListProperty("lists").promise;

        expect(lists).toEqual([[], [], []]);
    });

    test("nested array with mixed types", async () => {
        const json = '{"mixed":[[1,"two",true],[null,4.5,false]]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const mixed = await parser.getListProperty("mixed").promise;

        expect(mixed).toEqual([[1, "two", true], [null, 4.5, false]]);
    });
});
