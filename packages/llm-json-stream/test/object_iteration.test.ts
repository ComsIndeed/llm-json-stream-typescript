/**
 * Test to verify object iteration yields [key, AsyncJson<V>] tuples
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Object Iteration - Key-Value Pairs", () => {
    test("iterating over an object yields [key, AsyncJson<V>] tuples", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const user = jsonStream.get<{ name: string; age: number }>("");

        const properties: Array<[string, any]> = [];
        for await (const entry of user) {
            // Entry should be [key, AsyncJson<V>]
            expect(Array.isArray(entry)).toBe(true);
            expect(entry.length).toBe(2);

            const [key, valueAsync] = entry;
            expect(typeof key).toBe("string");

            // Await the AsyncJson to get the value
            const value = await valueAsync;
            properties.push([key, value]);
        }

        // Should have received both properties
        expect(properties.length).toBe(2);
        expect(properties).toContainEqual(["name", "Alice"]);
        expect(properties).toContainEqual(["age", 30]);
    });

    test("object iteration via paths() also yields tuples", async () => {
        const json = '{"x":1,"y":2,"z":3}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<
            { x: number; y: number; z: number }
        >(stream);
        const paths = jsonStream.paths();

        const entries: Array<[string, number]> = [];
        for await (const [key, valueAsync] of paths) {
            const value = await valueAsync;
            entries.push([key, value]);
        }

        expect(entries.length).toBe(3);
        expect(entries).toContainEqual(["x", 1]);
        expect(entries).toContainEqual(["y", 2]);
        expect(entries).toContainEqual(["z", 3]);
    });
});
