/**
 * Tests for map/object property parsing
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../../src/utilities/stream_text_in_chunks.js";

describe("Map Property Tests", () => {
    test("simple object", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const rootStream = parser.getMapProperty("");

        const finalValue = await rootStream.future;
        expect(finalValue).toEqual({ name: "Alice", age: 30 });
    });

    test("empty object", async () => {
        const json = '{"data":{}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const dataStream = parser.getMapProperty("data");

        const finalValue = await dataStream.future;
        expect(finalValue).toEqual({});
    });

    test("nested objects", async () => {
        const json = '{"user":{"profile":{"name":"Bob"}}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const profileStream = parser.getMapProperty("user.profile");

        const finalValue = await profileStream.future;
        expect(finalValue).toEqual({ name: "Bob" });
    });

    test("object with mixed value types", async () => {
        const json = '{"name":"Alice","age":30,"active":true,"data":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const rootStream = parser.getMapProperty("");

        const finalValue = await rootStream.future;
        expect(finalValue).toEqual({
            name: "Alice",
            age: 30,
            active: true,
            data: null,
        });
    });

    test("deeply nested object", async () => {
        const json = '{"a":{"b":{"c":{"d":{"e":"deep"}}}}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 9,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const deepStream = parser.getMapProperty("a.b.c.d");

        const finalValue = await deepStream.future;
        expect(finalValue).toEqual({ e: "deep" });
    });

    test("object property access with dot notation", async () => {
        const json = '{"user":{"name":"Alice","email":"alice@example.com"}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const nameStream = parser.getStringProperty("user.name");
        const emailStream = parser.getStringProperty("user.email");

        const [name, email] = await Promise.all([
            nameStream.future,
            emailStream.future,
        ]);

        expect(name).toBe("Alice");
        expect(email).toBe("alice@example.com");
    });

    test("chainable property access", async () => {
        const json =
            '{"company":{"employees":[{"name":"Alice","role":"Engineer"}]}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const parser = new JsonStreamParser(stream);
        const employeeName = parser.getStringProperty(
            "company.employees[0].name",
        );
        const employeeRole = parser.getStringProperty(
            "company.employees[0].role",
        );

        const [name, role] = await Promise.all([
            employeeName.future,
            employeeRole.future,
        ]);

        expect(name).toBe("Alice");
        expect(role).toBe("Engineer");
    });
});
