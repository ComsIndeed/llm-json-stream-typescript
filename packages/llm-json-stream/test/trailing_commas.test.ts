import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Trailing Commas - All Value Types in Arrays", () => {
    test("trailing comma after string in array", async () => {
        const input = '{"items":["first","second","last",]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const items = await parser.get<any[]>("items");

        expect(items).toEqual(["first", "second", "last"]);
    });

    test("trailing comma after number in array", async () => {
        const input = '{"nums":[1,2,42,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 6,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const nums = await parser.get<any[]>("nums");

        expect(nums).toEqual([1, 2, 42]);
    });

    test("trailing comma after decimal number in array", async () => {
        const input = '{"prices":[19.99,29.99,39.99,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const prices = await parser.get<any[]>("prices");

        expect(prices).toEqual([19.99, 29.99, 39.99]);
    });

    test("trailing comma after boolean true in array", async () => {
        const input = '{"flags":[false,true,true,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const flags = await parser.get<any[]>("flags");

        expect(flags).toEqual([false, true, true]);
    });

    test("trailing comma after boolean false in array", async () => {
        const input = '{"flags":[true,true,false,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const flags = await parser.get<any[]>("flags");

        expect(flags).toEqual([true, true, false]);
    });

    test("trailing comma after null in array", async () => {
        const input = '{"nullable":[1,"text",null,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const nullable = await parser.get<any[]>("nullable");

        expect(nullable).toEqual([1, "text", null]);
    });

    test("trailing comma after nested object in array", async () => {
        const input = '{"items":[{"a":1},{"b":2},{"c":3},]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const items = await parser.get<any[]>("items");

        expect(items.length).toBe(3);
        expect(items[2]).toEqual({ c: 3 });
    });

    test("trailing comma after nested array in array", async () => {
        const input = '{"matrix":[[1,2],[3,4],[5,6],]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 9,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const matrix = await parser.get<any[]>("matrix");

        expect(matrix.length).toBe(3);
        expect(matrix[2]).toEqual([5, 6]);
    });

    test("trailing comma after empty string in array", async () => {
        const input = '{"strings":["a","b","",]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const strings = await parser.get<any[]>("strings");

        expect(strings).toEqual(["a", "b", ""]);
    });

    test("trailing comma after zero in array", async () => {
        const input = '{"nums":[1,2,0,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 6,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const nums = await parser.get<any[]>("nums");

        expect(nums).toEqual([1, 2, 0]);
    });

    test("trailing comma after negative number in array", async () => {
        const input = '{"nums":[10,-5,-99,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const nums = await parser.get<any[]>("nums");

        expect(nums).toEqual([10, -5, -99]);
    });
});

describe("Trailing Commas - All Value Types in Objects", () => {
    test("trailing comma after string value in object", async () => {
        const input = '{"name":"Alice","city":"NYC",}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ name: "Alice", city: "NYC" });
    });

    test("trailing comma after number value in object", async () => {
        const input = '{"a":1,"b":2,"c":3,}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 6,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    test("trailing comma after boolean in object", async () => {
        const input = '{"active":true,"verified":false,}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ active: true, verified: false });
    });

    test("trailing comma after null in object", async () => {
        const input = '{"value":42,"data":null,}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ value: 42, data: null });
    });

    test("trailing comma after nested object in object", async () => {
        const input = '{"user":{"name":"Bob"},}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ user: { name: "Bob" } });
    });

    test("trailing comma after array in object", async () => {
        const input = '{"items":[1,2,3],}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 6,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ items: [1, 2, 3] });
    });
});

describe("Trailing Commas - Multiple Levels", () => {
    test("nested trailing commas in arrays", async () => {
        const input = '{"data":[[1,2,],[3,4,],]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 7,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const data = await parser.get<any[]>("data");

        expect(data).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    test("nested trailing commas in objects", async () => {
        const input = '{"outer":{"inner":{"value":42,},},}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ outer: { inner: { value: 42 } } });
    });

    test("mixed trailing commas in complex structure", async () => {
        const input = '{"list":[{"a":1,},{"b":2,},],"obj":{"x":true,},}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 12,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({
            list: [{ a: 1 }, { b: 2 }],
            obj: { x: true },
        });
    });
});

describe("Trailing Commas - Edge Cases", () => {
    test("single element array with trailing comma", async () => {
        const input = '{"single":[42,]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const single = await parser.get<any[]>("single");

        expect(single).toEqual([42]);
    });

    test("single property object with trailing comma", async () => {
        const input = '{"only":"value",}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const result = await parser.get<Record<string, any>>("");

        expect(result).toEqual({ only: "value" });
    });

    test("empty array with no trailing comma (baseline)", async () => {
        const input = '{"empty":[]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const empty = await parser.get<any[]>("empty");

        expect(empty).toEqual([]);
    });

    test("empty object with no trailing comma (baseline)", async () => {
        const input = '{"empty":{}}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const empty = await parser.get<Record<string, any>>("empty");

        expect(empty).toEqual({});
    });
});
