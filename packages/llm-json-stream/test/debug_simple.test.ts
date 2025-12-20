import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";


describe("Debug Simple List", () => {
    test("simple number array - big chunks", async () => {
        const json = '{"numbers": [1, 2, 3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });
        const parser = JsonStream.parse(stream);

        // console.log("=== Big chunks test ===");
        const numbersStream = parser.get<any[]>("numbers");

        const result = await numbersStream;
        // console.log("Result:", result);

        expect(result).toEqual([1, 2, 3]);
    });

    test("simple number array - small chunks", async () => {
        const json = '{"numbers":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const numbersStream = parser.get<any[]>("numbers");

        const result = await numbersStream;

        expect(result).toEqual([1, 2, 3]);
    });
});

