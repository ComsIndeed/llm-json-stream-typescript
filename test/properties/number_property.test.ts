/**
 * Tests for number property parsing
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../../src/utilities/stream_text_in_chunks.js";

describe("Number Property Tests", () => {
    test("positive integer", async () => {
        const json = '{"age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const ageStream = parser.getNumberProperty("age");

        const streamEvents: number[] = [];
        ageStream.stream.on("data", (value: number) => {
            streamEvents.push(value);
        });

        const finalValue = await ageStream.future;

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

        const parser = new JsonStreamParser(stream);
        const tempStream = parser.getNumberProperty("temperature");

        const finalValue = await tempStream.future;
        expect(finalValue).toBe(-5);
    });

    test("floating point number", async () => {
        const json = '{"price":19.99}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const priceStream = parser.getNumberProperty("price");

        const finalValue = await priceStream.future;
        expect(finalValue).toBe(19.99);
    });

    test("zero", async () => {
        const json = '{"count":0}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const countStream = parser.getNumberProperty("count");

        const finalValue = await countStream.future;
        expect(finalValue).toBe(0);
    });

    test("negative zero", async () => {
        const json = '{"value":-0}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        const finalValue = await valueStream.future;
        expect(finalValue).toBe(-0);
    });

    test("scientific notation", async () => {
        const json = '{"distance":1.5e10}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const distanceStream = parser.getNumberProperty("distance");

        const finalValue = await distanceStream.future;
        expect(finalValue).toBe(1.5e10);
    });

    test("large number", async () => {
        const json = '{"population":7800000000}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const popStream = parser.getNumberProperty("population");

        const finalValue = await popStream.future;
        expect(finalValue).toBe(7800000000);
    });

    test("number in nested object", async () => {
        const json = '{"user":{"age":25}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const ageStream = parser.getNumberProperty("user.age");

        const finalValue = await ageStream.future;
        expect(finalValue).toBe(25);
    });

    test("number in array", async () => {
        const json = '{"scores":[95,87,92]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const score0 = parser.getNumberProperty("scores[0]");
        const score1 = parser.getNumberProperty("scores[1]");
        const score2 = parser.getNumberProperty("scores[2]");

        const [val0, val1, val2] = await Promise.all([
            score0.future,
            score1.future,
            score2.future,
        ]);

        expect(val0).toBe(95);
        expect(val1).toBe(87);
        expect(val2).toBe(92);
    });
});
