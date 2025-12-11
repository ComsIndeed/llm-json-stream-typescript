import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Debug Simple List", () => {
    test("simple number array - big chunks", async () => {
        const json = '{"numbers": [1, 2, 3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 100,
            interval: 0,
        });
        const parser = new JsonStreamParser(stream);

        console.log("=== Big chunks test ===");
        const numbersStream = parser.getListProperty("numbers");

        const result = await numbersStream.promise;
        console.log("Result:", result);

        expect(result).toEqual([1, 2, 3]);
    });

    test("simple number array - small chunks", async () => {
        const json = '{"numbers":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 6,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const numbersStream = parser.getListProperty("numbers");

        const result = await numbersStream.promise;

        expect(result).toEqual([1, 2, 3]);
    });
});
