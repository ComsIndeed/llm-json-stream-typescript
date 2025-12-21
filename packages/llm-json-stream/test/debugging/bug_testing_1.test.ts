import { describe, expect, it } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../../src/index.js";

describe("Aggressive Bug Verification", () => {
    // BUG #3: Proving the Race Condition with a truly synchronous-ready iterable
    it("BUG #3: Race condition prevents root access when stream starts immediately", async () => {
        const json = '{"name":"Alice"}';
        // We use a custom iterable that doesn't 'await' between start and yield
        const syncIter = {
            [Symbol.asyncIterator]: () => {
                let yielded = false;
                return {
                    next: async () => {
                        if (yielded) return { done: true, value: undefined };
                        yielded = true;
                        return { done: false, value: json };
                    },
                };
            },
        };

        const stream = JsonStream.parse(syncIter);
        // If the race condition exists, the internal parser processed 'json'
        // before setupPropertyInterception() finished.
        const root = await Promise.race([
            stream.get(""),
            new Promise((_, rej) =>
                setTimeout(() => rej(new Error("STUCK_PENDING")), 100)
            ),
        ]);

        expect(root).toBeDefined();
    });

    // BUG #7: Verifying that .length fails to return a number
    // UPDATE: .length has been removed from the API as it wasn't implemented
    it("BUG #7: array.length removed from API - use await array then .length", async () => {
        const stream = JsonStream.parse(
            streamTextInChunks({
                text: '{"items":[1,2,3]}',
                chunkSize: 1,
                interval: 10,
            }),
        );
        const paths = stream.paths() as any;

        // Get the full array and check its length
        const items = await paths.items;
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBe(3);
    });

    // BUG #5: Chained .get() on Proxies
    it("BUG #5: Chained .get() on a proxy path fails to resolve", async () => {
        const stream = JsonStream.parse(
            streamTextInChunks({
                text: '{"user":{"profile":{"id":123}}}',
                chunkSize: 1,
                interval: 10,
            }),
        );
        const paths = stream.paths() as any;

        // Testing: paths.user.get("profile.id")
        const id = await paths.user.get("profile.id");
        expect(id).toBe(123);
    });

    // BUG #11: Unbuffered iteration on pending properties
    it("BUG #11: .unbuffered() on a pending proxy property should work", async () => {
        const stream = JsonStream.parse(streamTextInChunks({
            text: '{"desc":"hello world"}',
            chunkSize: 1,
            interval: 50,
        }));
        const paths = stream.paths() as any;

        // Accessing property immediately (it's pending)
        const iterator = paths.desc.unbuffered();
        const chunks: string[] = [];

        for await (const chunk of iterator) {
            chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
    });
});
