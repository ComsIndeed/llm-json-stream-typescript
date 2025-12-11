import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

function timeout(ms: number): Promise<never> {
    return new Promise((_, rej) =>
        setTimeout(() => rej(new Error("Timeout")), ms)
    );
}

describe("Error Handling Tests", () => {
    test("complete JSON works", async () => {
        const stream = streamTextInChunks({
            text: '{"name":"Alice"}',
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);
        expect(await parser.getStringProperty("name").promise).toBe("Alice");
    });

    test("slow stream times out", async () => {
        const stream = streamTextInChunks({
            text: '{"v":42}',
            chunkSize: 5,
            interval: 1000,
        });
        const parser = new JsonStreamParser(stream);
        await expect(
            Promise.race([parser.getNumberProperty("v").promise, timeout(200)]),
        ).rejects.toThrow("Timeout");
    });
});

describe("Edge Cases", () => {
    test("empty object", async () => {
        const stream = streamTextInChunks({
            text: "{}",
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);
        expect(await parser.getMapProperty("").promise).toEqual({});
    });

    test("whitespace", async () => {
        const stream = streamTextInChunks({
            text: '  { "a" : 1 }  ',
            chunkSize: 5,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);
        expect(await parser.getNumberProperty("a").promise).toBe(1);
    });
});
