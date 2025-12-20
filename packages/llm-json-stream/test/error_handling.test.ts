import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

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
        const parser = JsonStream.parse(stream);
        expect(await parser.get<string>("name")).toBe("Alice");
    });

    test("slow stream times out", async () => {
        const stream = streamTextInChunks({
            text: '{"v":42}',
            chunkSize: 5,
            interval: 1000,
        });
        const parser = JsonStream.parse(stream);
        await expect(
            Promise.race([parser.get<number>("v"), timeout(200)]),
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
        const parser = JsonStream.parse(stream);
        expect(await parser.get<Record<string, any>>("")).toEqual({});
    });

    test("whitespace", async () => {
        const stream = streamTextInChunks({
            text: '  { "a" : 1 }  ',
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);
        expect(await parser.get<number>("a")).toBe(1);
    });
});
