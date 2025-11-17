/**
 * Tests for boolean property parsing
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

        // Collect stream events
        const streamEvents: boolean[] = [];
        activeStream.stream.on("data", (value: boolean) => {
            streamEvents.push(value);
        });

        // Wait for the future to resolve
        const finalValue = await activeStream.future;

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
        enabledStream.stream.on("data", (value: boolean) => {
            streamEvents.push(value);
        });

        const finalValue = await enabledStream.future;

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

        const finalValue = await verifiedStream.future;
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
            flag0.future,
            flag1.future,
            flag2.future,
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
            active.future,
            enabled.future,
            verified.future,
        ]);

        expect(activeVal).toBe(true);
        expect(enabledVal).toBe(false);
        expect(verifiedVal).toBe(true);
    });
});
