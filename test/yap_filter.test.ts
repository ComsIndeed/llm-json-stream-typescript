import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Yap Filter - Stop parsing after root object completes", () => {
    test("Parser stops after root map object closes", async () => {
        const input =
            '{"name": "Valid"} \n\n Here is some extra text I generated!';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const nameStream = parser.getStringProperty("name");

        // Parser should complete gracefully without crashing
        const result = await nameStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const listStream = parser.getListProperty("");

        // Parser should complete gracefully
        const result = await listStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const titleStream = parser.getStringProperty("title");

        const result = await titleStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const dataStream = parser.getMapProperty("");

        const result = await dataStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const userStream = parser.getMapProperty("user");
        const nameStream = parser.getStringProperty("user.name");
        const ageStream = parser.getNumberProperty("user.age");

        const [user, name, age] = await Promise.all([
            userStream.promise,
            nameStream.promise,
            ageStream.promise,
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
        const parser = new JsonStreamParser(stream);

        const valueStream = parser.getNumberProperty("value");

        const result = await valueStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const okStream = parser.getBooleanProperty("ok");

        const result = await okStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const dataStream = parser.getMapProperty("data");
        const itemsStream = parser.getListProperty("data.items");
        const countStream = parser.getNumberProperty("data.meta.count");

        const [data, items, count] = await Promise.all([
            dataStream.promise,
            itemsStream.promise,
            countStream.promise,
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
        const parser = new JsonStreamParser(stream);

        const listStream = parser.getListProperty("");

        const result = await listStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const singleStream = parser.getStringProperty("single");

        const result = await singleStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const successStream = parser.getBooleanProperty("success");

        const result = await successStream.promise;
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
        const parser = new JsonStreamParser(stream);

        const dataStream = parser.getNullProperty("data");

        const result = await dataStream.promise;
        expect(result).toBe(null);

        parser.dispose();
    });
});
