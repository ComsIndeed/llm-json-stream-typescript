/**
 * Tests for boolean property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Booleans are atomic values - they emit ONCE when parsing completes,
 * not incrementally like strings.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../../src/index.js";


describe("Boolean Property Tests", () => {
    test("true value", async () => {
        const json = '{"active":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const activeStream = parser.get<boolean>("active");

        // Collect stream events using async iterator
        const streamEvents: boolean[] = [];
        for await (const value of activeStream) {
            streamEvents.push(value);
        }

        // Wait for the future to resolve
        const finalValue = await activeStream;

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

        const parser = JsonStream.parse(stream);
        const enabledStream = parser.get<boolean>("enabled");

        const streamEvents: boolean[] = [];
        for await (const value of enabledStream) {
            streamEvents.push(value);
        }

        const finalValue = await enabledStream;

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

        const parser = JsonStream.parse(stream);
        const verifiedStream = parser.get<boolean>("user.verified");

        const finalValue = await verifiedStream;
        expect(finalValue).toBe(true);
    });

    test("boolean in array", async () => {
        const json = '{"flags":[true,false,true]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const flag0 = parser.get<boolean>("flags[0]");
        const flag1 = parser.get<boolean>("flags[1]");
        const flag2 = parser.get<boolean>("flags[2]");

        const [val0, val1, val2] = await Promise.all([
            flag0,
            flag1,
            flag2,
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

        const parser = JsonStream.parse(stream);
        const active = parser.get<boolean>("active");
        const enabled = parser.get<boolean>("enabled");
        const verified = parser.get<boolean>("verified");

        const [activeVal, enabledVal, verifiedVal] = await Promise.all([
            active,
            enabled,
            verified,
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

        const parser = JsonStream.parse(stream);
        const flagStream = parser.get<boolean>("flag");

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

