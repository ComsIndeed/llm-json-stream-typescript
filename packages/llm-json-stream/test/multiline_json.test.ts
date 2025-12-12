/**
 * Tests for multiline JSON handling
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Multiline JSON Tests", () => {
    test("JSON with newlines in strings", async () => {
        const json = '{"text":"Line 1\\nLine 2\\nLine 3"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const textStream = parser.getStringProperty("text");

        const result = await textStream.promise;
        expect(result).toBe("Line 1\nLine 2\nLine 3");
    });

    test("formatted JSON with indentation", async () => {
        const json = `{
  "name": "Alice",
  "age": 30
}`;
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = parser.getStringProperty("name");
        const age = parser.getNumberProperty("age");

        const [nameVal, ageVal] = await Promise.all([name.promise, age.promise]);

        expect(nameVal).toBe("Alice");
        expect(ageVal).toBe(30);
    });

    test("JSON with various whitespace", async () => {
        const json = '{  "a" : 1 ,  "b"  :  2  }';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const a = parser.getNumberProperty("a");
        const b = parser.getNumberProperty("b");

        const [aVal, bVal] = await Promise.all([a.promise, b.promise]);

        expect(aVal).toBe(1);
        expect(bVal).toBe(2);
    });

    test("compact vs formatted JSON equivalence", async () => {
        const compactJson = '{"user":{"name":"Bob","age":25}}';
        const formattedJson = `{
  "user": {
    "name": "Bob",
    "age": 25
  }
}`;

        const stream1 = streamTextInChunks({
            text: compactJson,
            chunkSize: 10,
            interval: 10,
        });

        const stream2 = streamTextInChunks({
            text: formattedJson,
            chunkSize: 10,
            interval: 10,
        });

        const parser1 = new JsonStreamParser(stream1);
        const parser2 = new JsonStreamParser(stream2);

        const name1 = await parser1.getStringProperty("user.name").promise;
        const name2 = await parser2.getStringProperty("user.name").promise;

        expect(name1).toBe(name2);
        expect(name1).toBe("Bob");
    });

    test("newlines in property values", async () => {
        const json = '{"poem":"Roses are red\\nViolets are blue"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 9,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const poemStream = parser.getStringProperty("poem");

        const result = await poemStream.promise;
        expect(result).toBe("Roses are red\nViolets are blue");
    });
});

