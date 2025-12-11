/**
 * Tests for null property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Null is an atomic value - it emits ONCE when parsing completes,
 * not incrementally like strings.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../../src/utilities/stream_text_in_chunks.js";

describe("Null Property Tests", () => {
    test("null value", async () => {
        const json = '{"value":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNullProperty("value");

        const streamEvents: null[] = [];
        for await (const value of valueStream) {
            streamEvents.push(value);
        }

        const finalValue = await valueStream.promise;

        // Null emits once when complete
        expect(streamEvents).toEqual([null]);
        expect(finalValue).toBeNull();
    });

    test("null in nested object", async () => {
        const json = '{"user":{"avatar":null}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const avatarStream = parser.getNullProperty("user.avatar");

        const finalValue = await avatarStream.promise;
        expect(finalValue).toBeNull();
    });

    test("null in array", async () => {
        const json = '{"items":[null,null,null]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const item0 = parser.getNullProperty("items[0]");
        const item1 = parser.getNullProperty("items[1]");
        const item2 = parser.getNullProperty("items[2]");

        const [val0, val1, val2] = await Promise.all([
            item0.promise,
            item1.promise,
            item2.promise,
        ]);

        expect(val0).toBeNull();
        expect(val1).toBeNull();
        expect(val2).toBeNull();
    });

    test("multiple null properties", async () => {
        const json = '{"a":null,"b":null,"c":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const a = parser.getNullProperty("a");
        const b = parser.getNullProperty("b");
        const c = parser.getNullProperty("c");

        const [aVal, bVal, cVal] = await Promise.all([
            a.promise,
            b.promise,
            c.promise,
        ]);

        expect(aVal).toBeNull();
        expect(bVal).toBeNull();
        expect(cVal).toBeNull();
    });

    test("async iterator emits null value once", async () => {
        const json = '{"value":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNullProperty("value");

        // Use async iterator pattern
        const values: null[] = [];
        for await (const value of valueStream) {
            values.push(value);
        }

        // Null emits exactly once
        expect(values.length).toBe(1);
        expect(values[0]).toBeNull();
    });
});
