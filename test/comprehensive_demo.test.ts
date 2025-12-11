/**
 * Comprehensive test suite demonstrating chunk size and stream speed variations
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Comprehensive Chunk Size & Speed Matrix", () => {
    const testJson = '{"name":"Alice","age":30,"active":true}';
    const chunkSizes = [1, 3, 10, 50, 100, 1000];
    const speeds = [0, 5, 50, 100]; // milliseconds

    test.each(
        chunkSizes.flatMap((chunkSize) =>
            speeds.map((speed) => ({ chunkSize, speed }))
        ),
    )(
        "chunkSize=$chunkSize, speed=$speed ms",
        async ({ chunkSize, speed }: { chunkSize: number; speed: number }) => {
            const stream = streamTextInChunks({
                text: testJson,
                chunkSize,
                interval: speed,
            });

            const parser = new JsonStreamParser(stream);
            const nameStream = parser.getStringProperty("name");
            const ageStream = parser.getNumberProperty("age");
            const activeStream = parser.getBooleanProperty("active");

            const [name, age, active] = await Promise.all([
                nameStream.promise,
                ageStream.promise,
                activeStream.promise,
            ]);

            expect(name).toBe("Alice");
            expect(age).toBe(30);
            expect(active).toBe(true);
        },
    );
});

describe("Visual Demonstration of Bug Scenario", () => {
    test("DEMONSTRATION: Tiny value, huge chunk", async () => {
        const testJson = '{"x":"a"}';
        const chunkSize = 1000;

        const stream = streamTextInChunks({
            text: testJson,
            chunkSize,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const xStream = parser.getStringProperty("x");

        const streamEvents: string[] = [];
        xStream.stream?.on("data", (chunk: string) => {
            streamEvents.push(chunk);
        });

        const result = await xStream.promise;

        expect(result).toBe("a");
        expect(streamEvents.length).toBeGreaterThan(0);
    });

    test("DEMONSTRATION: Normal chunking pattern", async () => {
        const testJson = '{"title":"My Great Blog Post"}';

        const stream = streamTextInChunks({
            text: testJson,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const titleStream = parser.getStringProperty("title");

        const chunks: string[] = [];
        titleStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const result = await titleStream.promise;

        expect(result).toBe("My Great Blog Post");
        expect(chunks.join("")).toBe("My Great Blog Post");
    });

    test("DEMONSTRATION: Realistic LLM streaming", async () => {
        const testJson =
            '{"response":"This is a realistic LLM response that comes in chunks"}';

        const stream = streamTextInChunks({
            text: testJson,
            chunkSize: 15,
            interval: 20,
        });

        const parser = new JsonStreamParser(stream);
        const responseStream = parser.getStringProperty("response");

        const chunks: string[] = [];
        responseStream.stream?.on("data", (chunk: string) => {
            chunks.push(chunk);
        });

        const result = await responseStream.promise;

        expect(result).toBe(
            "This is a realistic LLM response that comes in chunks",
        );
        expect(chunks.length).toBeGreaterThan(1);
    });
});

describe("Complex JSON Structures", () => {
    test("deeply nested object with arrays", async () => {
        const json = '{"level1":{"level2":{"level3":{"items":[1,2,3]}}}}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getListProperty(
            "level1.level2.level3.items",
        );

        const result = await itemsStream.promise;
        expect(result).toEqual([1, 2, 3]);
    });

    test("large JSON document with multiple property types", async () => {
        const json = JSON.stringify({
            string: "text",
            number: 42,
            boolean: true,
            null: null,
            array: [1, 2, 3],
            object: { nested: "value" },
        });

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 20,
            interval: 5,
        });

        const parser = new JsonStreamParser(stream);

        const [str, num, bool, nul, arr, obj] = await Promise.all([
            parser.getStringProperty("string").promise,
            parser.getNumberProperty("number").promise,
            parser.getBooleanProperty("boolean").promise,
            parser.getNullProperty("null").promise,
            parser.getListProperty("array").promise,
            parser.getMapProperty("object").promise,
        ]);

        expect(str).toBe("text");
        expect(num).toBe(42);
        expect(bool).toBe(true);
        expect(nul).toBeNull();
        expect(arr).toEqual([1, 2, 3]);
        expect(obj).toEqual({ nested: "value" });
    });

    test("JSON with all property types", async () => {
        const json =
            '{"str":"hello","num":123,"bool":true,"nul":null,"arr":[1,2],"obj":{"a":1}}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const rootMap = await parser.getMapProperty("").promise;

        expect(rootMap).toMatchObject({
            str: "hello",
            num: 123,
            bool: true,
            nul: null,
            arr: [1, 2],
            obj: { a: 1 },
        });
    });
});
