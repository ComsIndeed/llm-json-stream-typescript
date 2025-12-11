/**
 * Tests for boolean property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Booleans are atomic values - they emit ONCE when parsing completes,
 * not incrementally like strings.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../../src/utilities/stream_text_in_chunks.js";

describe("Boolean Property Tests", () => {
    test("true value", async () => {
        const json = '{"active":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const activeStream = parser.getBooleanProperty("active");

        // Collect stream events using async iterator
        const streamEvents: boolean[] = [];
        for await (const value of activeStream) {
            streamEvents.push(value);
        }

        // Wait for the future to resolve
        const finalValue = await activeStream.promise;

        // Should emit the boolean value once when complete
        expect(streamEvents).toEqual([true]);
        expect(finalValue).toBe(true);
    });

    test("false value", async () => {
        const json = '{"enabled":false}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const enabledStream = parser.getBooleanProperty("enabled");

        const streamEvents: boolean[] = [];
        for await (const value of enabledStream) {
            streamEvents.push(value);
        }

        const finalValue = await enabledStream.promise;

        expect(streamEvents).toEqual([false]);
        expect(finalValue).toBe(false);
    });

    test("boolean in nested object", async () => {
        const json = '{"user":{"verified":true}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const verifiedStream = parser.getBooleanProperty("user.verified");

        const finalValue = await verifiedStream.promise;
        expect(finalValue).toBe(true);
    });

    test("boolean in array", async () => {
        const json = '{"flags":[true,false,true]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const flag0 = parser.getBooleanProperty("flags[0]");
        const flag1 = parser.getBooleanProperty("flags[1]");
        const flag2 = parser.getBooleanProperty("flags[2]");

        const [val0, val1, val2] = await Promise.all([
            flag0.promise,
            flag1.promise,
            flag2.promise,
        ]);

        expect(val0).toBe(true);
        expect(val1).toBe(false);
        expect(val2).toBe(true);
    });

    test("multiple boolean properties", async () => {
        const json = '{"active":true,"enabled":false,"verified":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const active = parser.getBooleanProperty("active");
        const enabled = parser.getBooleanProperty("enabled");
        const verified = parser.getBooleanProperty("verified");

        const [activeVal, enabledVal, verifiedVal] = await Promise.all([
            active.promise,
            enabled.promise,
            verified.promise,
        ]);

        expect(activeVal).toBe(true);
        expect(enabledVal).toBe(false);
        expect(verifiedVal).toBe(true);
    });

    test("async iterator emits boolean value once", async () => {
        const json = '{"flag":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const flagStream = parser.getBooleanProperty("flag");

        // Use async iterator pattern
        const values: boolean[] = [];
        for await (const value of flagStream) {
            values.push(value);
        }

        // Boolean emits exactly once with the final value
        expect(values.length).toBe(1);
        expect(values[0]).toBe(true);
    });
});
