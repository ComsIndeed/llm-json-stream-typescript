/**
 * Tests for stream completion behavior
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Stream Completion Tests", () => {
    test("all properties complete when stream ends", async () => {
        const json = '{"name":"Alice","age":30,"active":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const name = parser.get<string>("name");
        const age = parser.get<number>("age");
        const active = parser.get<boolean>("active");

        const [nameVal, ageVal, activeVal] = await Promise.all([
            name,
            age,
            active,
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

        const parser = JsonStream.parse(stream);
        const valueStream = parser.get<number>("value");

        const result = await valueStream;
        expect(result).toBe(42);
    });

    test("incomplete properties timeout or reject", async () => {
        const incompleteJson = '{"name":"Alice","age":';
        const stream = streamTextInChunks({
            text: incompleteJson,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const ageStream = parser.get<number>("age");

        // This should either reject or timeout
        await expect(
            Promise.race([
                ageStream,
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

        const parser = JsonStream.parse(stream);
        const messageStream = parser.get<string>("message");

        let listener1Completed = false;
        let listener2Completed = false;

        // Two separate async iterators from the same stream
        const listener1 = (async () => {
            for await (const _ of messageStream) {
                // Just consume
            }
            listener1Completed = true;
        })();

        const listener2 = (async () => {
            for await (const _ of messageStream) {
                // Just consume
            }
            listener2Completed = true;
        })();

        await messageStream;
        await listener1;
        await listener2;

        // Give events time to propagate
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(listener1Completed).toBe(true);
        expect(listener2Completed).toBe(true);
    });

    test("array iteration completes properly", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const itemsStream = parser.get<number[]>("items");

        const items: number[] = [];
        // Now iteration yields AsyncJson<E> for each element
        for await (const itemAsync of itemsStream) {
            const item = await itemAsync;
            items.push(item);
        }

        // Should have collected all elements
        expect(items).toEqual([1, 2, 3]);
    });

    test("nested property completion order", async () => {
        const json = '{"outer":{"middle":{"inner":"value"}}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const outer = parser.get<Record<string, any>>("outer");
        const middle = parser.get<Record<string, any>>("outer.middle");
        const inner = parser.get<string>("outer.middle.inner");

        const [outerVal, middleVal, innerVal] = await Promise.all([
            outer,
            middle,
            inner,
        ]);

        expect(innerVal).toBe("value");
        expect(middleVal).toEqual({ inner: "value" });
        expect(outerVal).toEqual({ middle: { inner: "value" } });
    });
});
