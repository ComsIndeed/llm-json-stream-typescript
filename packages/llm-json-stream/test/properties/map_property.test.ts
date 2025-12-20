/**
 * Tests for map/object property parsing
 * Uses async iterators as the primary streaming interface.
 *
 * NOTE: Maps emit SNAPSHOTS as properties complete.
 * Each emission contains the current state of the object.
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../../src/index.js";

describe("Map Property Tests", () => {
    test("simple object", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 7,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const rootStream = parser.get<Record<string, any>>("");

        const finalValue = await rootStream;
        expect(finalValue).toEqual({ name: "Alice", age: 30 });
    });

    test("empty object", async () => {
        const json = '{"data":{}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const dataStream = parser.get<Record<string, any>>("data");

        const finalValue = await dataStream;
        expect(finalValue).toEqual({});
    });

    test("nested objects", async () => {
        const json = '{"user":{"profile":{"name":"Bob"}}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const profileStream = parser.get<Record<string, any>>("user.profile");

        const finalValue = await profileStream;
        expect(finalValue).toEqual({ name: "Bob" });
    });

    test("object with mixed value types", async () => {
        const json = '{"name":"Alice","age":30,"active":true,"data":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const rootStream = parser.get<Record<string, any>>("");

        const finalValue = await rootStream;
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

        const parser = JsonStream.parse(stream);
        const deepStream = parser.get<Record<string, any>>("a.b.c.d");

        const finalValue = await deepStream;
        expect(finalValue).toEqual({ e: "deep" });
    });

    test("object property access with dot notation", async () => {
        const json = '{"user":{"name":"Alice","email":"alice@example.com"}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 12,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const nameStream = parser.get<string>("user.name");
        const emailStream = parser.get<string>("user.email");

        const [name, email] = await Promise.all([
            nameStream,
            emailStream,
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

        const parser = JsonStream.parse(stream);
        const employeeName = parser.get<string>(
            "company.employees[0].name",
        );
        const employeeRole = parser.get<string>(
            "company.employees[0].role",
        );

        const [name, role] = await Promise.all([
            employeeName,
            employeeRole,
        ]);

        expect(name).toBe("Alice");
        expect(role).toBe("Engineer");
    });

    test("async iterator emits map snapshots", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const parser = JsonStream.parse(stream);
        const rootStream = parser.get<Record<string, any>>("");

        // Collect all snapshots using async iterator
        const snapshots: Record<string, any>[] = [];
        for await (const snapshot of rootStream) {
            snapshots.push({ ...snapshot }); // Copy to preserve state
        }

        // Should have received incremental snapshots
        // Final snapshot should have both properties
        expect(snapshots.length).toBeGreaterThan(0);
        expect(snapshots[snapshots.length - 1]).toEqual({
            name: "Alice",
            age: 30,
        });
    });
});
