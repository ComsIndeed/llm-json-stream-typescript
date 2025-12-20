/**
 * Tests for multiline JSON handling
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";


describe("Multiline JSON Tests", () => {
    test("JSON with newlines in strings", async () => {
        const json = '{"text":"Line 1\\nLine 2\\nLine 3"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const textStream = parser.get<string>("text");

        const result = await textStream;
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

        const parser = JsonStream.parse(stream);
        const name = parser.get<string>("name");
        const age = parser.get<number>("age");

        const [nameVal, ageVal] = await Promise.all([name, age]);

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

        const parser = JsonStream.parse(stream);
        const a = parser.get<number>("a");
        const b = parser.get<number>("b");

        const [aVal, bVal] = await Promise.all([a, b]);

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

        const parser1 = JsonStream.parse(stream1);
        const parser2 = JsonStream.parse(stream2);

        const name1 = await parser1.get<string>("user.name");
        const name2 = await parser2.get<string>("user.name");

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

        const parser = JsonStream.parse(stream);
        const poemStream = parser.get<string>("poem");

        const result = await poemStream;
        expect(result).toBe("Roses are red\nViolets are blue");
    });
});

