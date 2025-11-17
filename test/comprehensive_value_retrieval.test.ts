/**
 * Tests for comprehensive value retrieval across all JSON types
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("Comprehensive Value Retrieval Tests", () => {
    test("retrieve all property types from complex JSON", async () => {
        const json =
            '{"name":"Alice","age":30,"active":true,"data":null,"tags":["a","b"],"meta":{"created":"2024-01-01"}}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 20,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        const [name, age, active, data, tags, meta] = await Promise.all([
            parser.getStringProperty("name").future,
            parser.getNumberProperty("age").future,
            parser.getBooleanProperty("active").future,
            parser.getNullProperty("data").future,
            parser.getListProperty("tags").future,
            parser.getMapProperty("meta").future,
        ]);

        expect(name).toBe("Alice");
        expect(age).toBe(30);
        expect(active).toBe(true);
        expect(data).toBeNull();
        expect(tags).toEqual(["a", "b"]);
        expect(meta).toEqual({ created: "2024-01-01" });
    });

    test("nested property access with dot notation", async () => {
        const json =
            '{"user":{"profile":{"name":"Bob","email":"bob@test.com"}}}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const name = await parser.getStringProperty("user.profile.name").future;
        const email = await parser.getStringProperty("user.profile.email")
            .future;

        expect(name).toBe("Bob");
        expect(email).toBe("bob@test.com");
    });

    test("array element access with bracket notation", async () => {
        const json = '{"items":["first","second","third"]}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        const [item0, item1, item2] = await Promise.all([
            parser.getStringProperty("items[0]").future,
            parser.getStringProperty("items[1]").future,
            parser.getStringProperty("items[2]").future,
        ]);

        expect(item0).toBe("first");
        expect(item1).toBe("second");
        expect(item2).toBe("third");
    });

    test("deeply nested path resolution", async () => {
        const json = '{"a":{"b":{"c":{"d":{"e":"deep"}}}}}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const value = await parser.getStringProperty("a.b.c.d.e").future;

        expect(value).toBe("deep");
    });

    test("simultaneous access to multiple properties", async () => {
        const json = '{"a":1,"b":2,"c":3,"d":4,"e":5}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        const [a, b, c, d, e] = await Promise.all([
            parser.getNumberProperty("a").future,
            parser.getNumberProperty("b").future,
            parser.getNumberProperty("c").future,
            parser.getNumberProperty("d").future,
            parser.getNumberProperty("e").future,
        ]);

        expect([a, b, c, d, e]).toEqual([1, 2, 3, 4, 5]);
    });

    test("property access before stream starts", async () => {
        const json = '{"value":42}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 50,
        });

        const parser = new JsonStreamParser(stream);
        const valueStream = parser.getNumberProperty("value");

        // Access property before stream has delivered value
        const value = await valueStream.future;
        expect(value).toBe(42);
    });

    test("property access during streaming", async () => {
        const json = '{"first":1,"second":2,"third":3}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 20,
        });

        const parser = new JsonStreamParser(stream);

        // Start accessing first property
        const firstPromise = parser.getNumberProperty("first").future;

        // Wait a bit, then access second
        await new Promise((resolve) => setTimeout(resolve, 30));
        const secondPromise = parser.getNumberProperty("second").future;

        const [first, second] = await Promise.all([
            firstPromise,
            secondPromise,
        ]);

        expect(first).toBe(1);
        expect(second).toBe(2);
    });

    test("property access after stream completes", async () => {
        const json = '{"value":42}';

        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);

        // Wait for stream to complete
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Access property after stream has completed
        const valueStream = parser.getNumberProperty("value");
        const value = await valueStream.future;

        expect(value).toBe(42);
    });
});
