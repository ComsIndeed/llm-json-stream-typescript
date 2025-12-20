/**
 * Tests for number property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Numbers are atomic values - they emit ONCE when parsing completes,
 * not incrementally like strings.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../../src/index.js";


describe("Number Property Tests", () => {
    test("positive integer", async () => {
        const json = '{"age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const ageStream = parser.get<number>("age");

        const streamEvents: number[] = [];
        for await (const value of ageStream) {
            streamEvents.push(value);
        }

        const finalValue = await ageStream;

        // Number emits once when complete
        expect(streamEvents).toEqual([30]);
        expect(finalValue).toBe(30);
    });

    test("negative integer", async () => {
        const json = '{"temperature":-5}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const tempStream = parser.get<number>("temperature");

        const finalValue = await tempStream;
        expect(finalValue).toBe(-5);
    });

    test("floating point number", async () => {
        const json = '{"price":19.99}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const priceStream = parser.get<number>("price");

        const finalValue = await priceStream;
        expect(finalValue).toBe(19.99);
    });

    test("zero", async () => {
        const json = '{"count":0}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const countStream = parser.get<number>("count");

        const finalValue = await countStream;
        expect(finalValue).toBe(0);
    });

    test("negative zero", async () => {
        const json = '{"value":-0}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<number>("value");

        const finalValue = await valueStream;
        expect(finalValue).toBe(-0);
    });

    test("scientific notation", async () => {
        const json = '{"distance":1.5e10}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const distanceStream = parser.get<number>("distance");

        const finalValue = await distanceStream;
        expect(finalValue).toBe(1.5e10);
    });

    test("large number", async () => {
        const json = '{"population":7800000000}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const popStream = parser.get<number>("population");

        const finalValue = await popStream;
        expect(finalValue).toBe(7800000000);
    });

    test("number in nested object", async () => {
        const json = '{"user":{"age":25}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const ageStream = parser.get<number>("user.age");

        const finalValue = await ageStream;
        expect(finalValue).toBe(25);
    });

    test("number in array", async () => {
        const json = '{"scores":[95,87,92]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const score0 = parser.get<number>("scores[0]");
        const score1 = parser.get<number>("scores[1]");
        const score2 = parser.get<number>("scores[2]");

        const [val0, val1, val2] = await Promise.all([
            score0,
            score1,
            score2,
        ]);

        expect(val0).toBe(95);
        expect(val1).toBe(87);
        expect(val2).toBe(92);
    });

    test("async iterator emits number value once", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<number>("value");

        // Use async iterator pattern
        const values: number[] = [];
        for await (const value of valueStream) {
            values.push(value);
        }

        // Number emits exactly once with the final value
        expect(values.length).toBe(1);
        expect(values[0]).toBe(42);
    });
});

