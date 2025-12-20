import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

describe("Yap Filter - Stop parsing after root object completes", () => {
    test("Parser stops after root map object closes", async () => {
        const input =
            '{"name": "Valid"} \n\n Here is some extra text I generated!';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const nameStream = parser.get<string>("name");

        // Parser should complete gracefully without crashing
        const result = await nameStream;
        expect(result).toBe("Valid");

        parser.dispose();
    });

    test("Parser stops after root list closes", async () => {
        const input = "[1, 2, 3] And here is more text after the array!";

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const listStream = parser.get<any[]>("");

        // Parser should complete gracefully
        const result = await listStream;
        expect(result).toEqual([1, 2, 3]);

        parser.dispose();
    });

    test("Parser handles JSON followed by markdown code fence", async () => {
        const input = '{"title": "Hello"}\n```';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const titleStream = parser.get<string>("title");

        const result = await titleStream;
        expect(result).toBe("Hello");

        parser.dispose();
    });

    test("Parser handles JSON followed by explanation text", async () => {
        const input =
            '{"key": "value"}\n\nI hope this JSON helps! Let me know if you need anything else.';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 15,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const dataStream = parser.get<Record<string, any>>("");

        const result = await dataStream;
        expect(result["key"]).toBe("value");

        parser.dispose();
    });

    test("Nested structures complete before yap filter triggers", async () => {
        const input =
            '{"user":{"name":"Alice","age":30}}\n\nHere is additional commentary!';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const userStream = parser.get<Record<string, any>>("user");
        const nameStream = parser.get<string>("user.name");
        const ageStream = parser.get<number>("user.age");

        const [user, name, age] = await Promise.all([
            userStream,
            nameStream,
            ageStream,
        ]);

        expect(name).toBe("Alice");
        expect(age).toBe(30);
        expect(user).toEqual({ name: "Alice", age: 30 });

        parser.dispose();
    });

    test("Parser ignores whitespace after valid JSON", async () => {
        const input = '{"value": 42}    \n\n\t   ';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const valueStream = parser.get<number>("value");

        const result = await valueStream;
        expect(result).toBe(42);

        parser.dispose();
    });

    test("Parser handles empty trailing content gracefully", async () => {
        const input = '{"ok": true}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const okStream = parser.get<boolean>("ok");

        const result = await okStream;
        expect(result).toBe(true);

        parser.dispose();
    });

    test("Complex nested JSON with trailing yap", async () => {
        const input = `{"data":{"items":[1,2,3],"meta":{"count":3}}}
    
    As you can see, the data structure contains 3 items with associated metadata.
    Let me know if you need any changes!`;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 12,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const dataStream = parser.get<Record<string, any>>("data");
        const itemsStream = parser.get<any[]>("data.items");
        const countStream = parser.get<number>("data.meta.count");

        const [data, items, count] = await Promise.all([
            dataStream,
            itemsStream,
            countStream,
        ]);

        expect(items).toEqual([1, 2, 3]);
        expect(count).toBe(3);
        expect(data).toEqual({ items: [1, 2, 3], meta: { count: 3 } });

        parser.dispose();
    });

    test("Array at root with trailing text", async () => {
        const input = '["apple", "banana", "cherry"]\n\nThese are fruits.';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const listStream = parser.get<any[]>("");

        const result = await listStream;
        expect(result).toEqual(["apple", "banana", "cherry"]);

        parser.dispose();
    });
});

describe("Yap Filter - Edge Cases", () => {
    test("Single value JSON with trailing text", async () => {
        const input = '{"single": "value"} Done!';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const singleStream = parser.get<string>("single");

        const result = await singleStream;
        expect(result).toBe("value");

        parser.dispose();
    });

    test("Boolean JSON with explanation", async () => {
        const input =
            '{"success": true} This indicates the operation was successful.';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const successStream = parser.get<boolean>("success");

        const result = await successStream;
        expect(result).toBe(true);

        parser.dispose();
    });

    test("Null value with trailing text", async () => {
        const input = '{"data": null} No data available.';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = JsonStream.parse(stream);

        const dataStream = parser.get<null>("data");

        const result = await dataStream;
        expect(result).toBe(null);

        parser.dispose();
    });
});
