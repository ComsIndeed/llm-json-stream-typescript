/**
 * Tests for stream completion behavior
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Stream Completion Tests", () => {
    test("all properties complete when stream ends", async () => {
        const json = '{"name":"Alice","age":30,"active":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = parser.getStringProperty("name");
        const age = parser.getNumberProperty("age");
        const active = parser.getBooleanProperty("active");

        const [nameVal, ageVal, activeVal] = await Promise.all([
            name.promise,
            age.promise,
            active.promise,
        ]);

        expect(nameVal).toBe("Alice");
        expect(ageVal).toBe(30);
        expect(activeVal).toBe(true);
    });

    test("futures resolve when stream ends", async () => {
        const json = '{"value":42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        const result = await valueStream.promise;
        expect(result).toBe(42);
    });

    test("incomplete properties timeout or reject", async () => {
        const incompleteJson = '{"name":"Alice","age":';
        const stream = streamTextInChunks({
            text: incompleteJson,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const ageStream = parser.getNumberProperty("age");

        // This should either reject or timeout
        await expect(
            Promise.race([
                ageStream.promise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), 500)
                ),
            ]),
        ).rejects.toThrow();
    });

    test("completion signals propagate to all listeners", async () => {
        const json = '{"message":"Hello World"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const messageStream = parser.getStringProperty("message");

        let listener1Completed = false;
        let listener2Completed = false;

        messageStream.stream?.on("data", () => {});
        messageStream.stream?.on("end", () => {
            listener1Completed = true;
        });

        messageStream.stream?.on("data", () => {});
        messageStream.stream?.on("end", () => {
            listener2Completed = true;
        });

        await messageStream.promise;

        // Give events time to propagate
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(listener1Completed).toBe(true);
        expect(listener2Completed).toBe(true);
    });

    test("onElement callbacks complete for partial arrays", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const itemsStream = parser.getListProperty("items");

        const elements: number[] = [];
        itemsStream.onElement((element, index) => {
            elements.push(index);
        });

        await itemsStream.promise;

        expect(elements).toEqual([0, 1, 2]);
    });

    test("nested property completion order", async () => {
        const json = '{"outer":{"middle":{"inner":"value"}}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const outer = parser.getMapProperty("outer");
        const middle = parser.getMapProperty("outer.middle");
        const inner = parser.getStringProperty("outer.middle.inner");

        const [outerVal, middleVal, innerVal] = await Promise.all([
            outer.promise,
            middle.promise,
            inner.promise,
        ]);

        expect(innerVal).toBe("value");
        expect(middleVal).toEqual({ inner: "value" });
        expect(outerVal).toEqual({ middle: { inner: "value" } });
    });
});
