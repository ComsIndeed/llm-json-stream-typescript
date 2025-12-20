/**
 * Tests for the new JsonStream API with schema support
 *
 * These tests validate the new unified API:
 * - JsonStream.parse<T>(stream)
 * - .get<T>(path) for manual path access
 * - .paths() for ergonomic property access
 * - AsyncJson<T> as both Promise and AsyncIterable
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream } from "../src/classes/json_stream.js";
import type { AsyncJson } from "../src/classes/json_stream.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

// Helper to add timeout to promises
function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    message = "Timeout",
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(message)), ms)
        ),
    ]);
}

// ============================================================================
// Type Definitions for Tests
// ============================================================================

interface User {
    name: string;
    age: number;
    email: string;
}

interface UsersResponse {
    label: string;
    description: string;
    users: User[];
}

interface BlogPost {
    title: string;
    content: string;
    author: {
        name: string;
        bio: string;
    };
    tags: string[];
    metadata: {
        views: number;
        likes: number;
        published: boolean;
    };
}

interface NestedData {
    level1: {
        level2: {
            level3: {
                value: string;
            };
        };
    };
}

// ============================================================================
// Basic JsonStream.parse() Tests
// ============================================================================

describe("JsonStream.parse() - Basic Usage", () => {
    test("creates a JsonStream from an async iterable", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        expect(jsonStream).toBeDefined();
        expect(typeof jsonStream.get).toBe("function");
        expect(typeof jsonStream.paths).toBe("function");

        await jsonStream.dispose();
    });

    test("supports generic type parameter for type safety", async () => {
        const json = '{"name":"Alice","age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<{ name: string; age: number }>(
            stream,
        );
        expect(jsonStream).toBeDefined();

        await jsonStream.dispose();
    });
});

// ============================================================================
// .get<T>(path) Tests
// ============================================================================

describe(".get<T>(path) - Manual Path Access", () => {
    test("gets a string property value", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const name = await withTimeout(jsonStream.get<string>("name"), 1000);

        expect(name).toBe("Alice");
    });

    test("gets a number property value", async () => {
        const json = '{"age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const age = await withTimeout(jsonStream.get<number>("age"), 1000);

        expect(age).toBe(30);
    });

    test("gets a boolean property value", async () => {
        const json = '{"active":true}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const active = await withTimeout(
            jsonStream.get<boolean>("active"),
            1000,
        );

        expect(active).toBe(true);
    });

    test("gets a null property value", async () => {
        const json = '{"data":null}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const data = await withTimeout(jsonStream.get<null>("data"), 1000);

        expect(data).toBe(null);
    });

    test("gets an array property value", async () => {
        const json = '{"items":[1,2,3]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const items = await withTimeout(
            jsonStream.get<number[]>("items"),
            1000,
        );

        expect(items).toEqual([1, 2, 3]);
    });

    test("gets an object property value", async () => {
        const json = '{"user":{"name":"Alice","age":30}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const user = await withTimeout(
            jsonStream.get<{ name: string; age: number }>("user"),
            1000,
        );

        expect(user).toEqual({ name: "Alice", age: 30 });
    });

    test("gets nested property using dot notation", async () => {
        const json = '{"user":{"name":"Alice"}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const name = await withTimeout(
            jsonStream.get<string>("user.name"),
            1000,
        );

        expect(name).toBe("Alice");
    });

    test("streams string chunks using for-await", async () => {
        const json = '{"description":"Hello World"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const chunks: string[] = [];

        const asyncJson = jsonStream.get<string>("description");

        // Use withTimeout for the iteration
        await withTimeout(
            (async () => {
                for await (const chunk of asyncJson) {
                    chunks.push(chunk);
                }
            })(),
            2000,
        );

        expect(chunks.join("")).toBe("Hello World");
    });

    test("chained .get() calls work", async () => {
        const json = '{"user":{"profile":{"name":"Alice"}}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const user = jsonStream.get<{ profile: { name: string } }>("user");
        const name = await withTimeout(user.get<string>("profile.name"), 1000);

        expect(name).toBe("Alice");
    });
});

// ============================================================================
// .paths() Tests
// ============================================================================

describe(".paths() - Ergonomic Property Access", () => {
    test("accesses top-level string property", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<{ name: string }>(stream);
        const paths = jsonStream.paths();
        const name = await withTimeout(paths.name, 1000);

        expect(name).toBe("Alice");
    });

    test("accesses top-level number property", async () => {
        const json = '{"age":30}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<{ age: number }>(stream);
        const paths = jsonStream.paths();
        const age = await withTimeout(paths.age, 1000);

        expect(age).toBe(30);
    });

    test("accesses nested object property with dot notation", async () => {
        const json = '{"user":{"name":"Alice"}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<{ user: { name: string } }>(stream);
        const paths = jsonStream.paths();
        const name = await withTimeout(paths.user.name, 1000);

        expect(name).toBe("Alice");
    });

    test("accesses array elements with bracket notation", async () => {
        const json = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 8,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<{ users: User[] }>(stream);
        const paths = jsonStream.paths();
        const firstUserName = await withTimeout(paths.users[0].name, 1000);

        expect(firstUserName).toBe("Alice");
    });

    test("streams chunks via paths", async () => {
        const json = '{"description":"Hello World"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<{ description: string }>(stream);
        const paths = jsonStream.paths();
        const chunks: string[] = [];

        await withTimeout(
            (async () => {
                for await (const chunk of paths.description) {
                    chunks.push(chunk);
                }
            })(),
            2000,
        );

        expect(chunks.join("")).toBe("Hello World");
    });
});

// ============================================================================
// AsyncJson<T> Promise + Iterable Tests
// ============================================================================

describe("AsyncJson<T> - Promise and Iterable", () => {
    test("is awaitable as a Promise", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const asyncJson = jsonStream.get<string>("name");

        // Should be awaitable
        const result = await withTimeout(asyncJson, 1000);
        expect(result).toBe("Alice");
    });

    test("supports .then() like a Promise", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const asyncJson = jsonStream.get<string>("name");

        // Should support .then()
        const result = await withTimeout(
            asyncJson.then((name: string) => name.toUpperCase()),
            1000,
        );
        expect(result).toBe("ALICE");
    });

    test("rejects when property not found", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const asyncJson = jsonStream.get<string>("nonexistent");

        // Access a nonexistent property - should eventually error
        try {
            await withTimeout(asyncJson, 500);
            // Should not reach here
            expect(true).toBe(false);
        } catch (err) {
            expect(err).toBeDefined();
        }
    });

    test("is iterable with for-await-of", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 2,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const asyncJson = jsonStream.get<string>("name");

        const chunks: string[] = [];
        await withTimeout(
            (async () => {
                for await (const chunk of asyncJson) {
                    chunks.push(chunk);
                }
            })(),
            2000,
        );

        expect(chunks.join("")).toBe("Alice");
    });
});

// ============================================================================
// Complex Schema Tests
// ============================================================================

describe("Complex Schema Tests", () => {
    test("parses UsersResponse schema", async () => {
        const json = JSON.stringify({
            label: "Test Users",
            description: "A list of test users",
            users: [
                { name: "Alice", age: 30, email: "alice@example.com" },
                { name: "Bob", age: 25, email: "bob@example.com" },
            ],
        });
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 15,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<UsersResponse>(stream);

        const label = await withTimeout(jsonStream.get<string>("label"), 1000);
        expect(label).toBe("Test Users");

        const users = await withTimeout(jsonStream.get<User[]>("users"), 1000);
        expect(users).toHaveLength(2);
        expect(users[0].name).toBe("Alice");
        expect(users[1].name).toBe("Bob");
    });

    test("parses BlogPost schema with nested objects", async () => {
        const json = JSON.stringify({
            title: "My Blog Post",
            content: "This is the content",
            author: {
                name: "Alice",
                bio: "A developer",
            },
            tags: ["tech", "programming"],
            metadata: {
                views: 100,
                likes: 50,
                published: true,
            },
        });
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 20,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<BlogPost>(stream);

        const title = await withTimeout(jsonStream.get<string>("title"), 1000);
        expect(title).toBe("My Blog Post");

        const authorName = await withTimeout(
            jsonStream.get<string>("author.name"),
            1000,
        );
        expect(authorName).toBe("Alice");

        const tags = await withTimeout(jsonStream.get<string[]>("tags"), 1000);
        expect(tags).toEqual(["tech", "programming"]);

        const views = await withTimeout(
            jsonStream.get<number>("metadata.views"),
            1000,
        );
        expect(views).toBe(100);

        const published = await withTimeout(
            jsonStream.get<boolean>("metadata.published"),
            1000,
        );
        expect(published).toBe(true);
    });

    test("parses deeply nested data", async () => {
        const json = JSON.stringify({
            level1: {
                level2: {
                    level3: {
                        value: "deep value",
                    },
                },
            },
        });
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 10,
            interval: 10,
        });

        const jsonStream = JsonStream.parse<NestedData>(stream);

        const value = await withTimeout(
            jsonStream.get<string>("level1.level2.level3.value"),
            1000,
        );
        expect(value).toBe("deep value");
    });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe("Edge Cases and Error Handling", () => {
    test("handles empty object", async () => {
        const json = "{}";
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 1,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);

        // Accessing a property that doesn't exist should eventually error
        try {
            await withTimeout(jsonStream.get("nonexistent"), 500);
            expect(true).toBe(false); // Should not reach here
        } catch (err) {
            expect(err).toBeDefined();
        }
    });

    test("handles empty array", async () => {
        const json = '{"items":[]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const items = await withTimeout(jsonStream.get<any[]>("items"), 1000);

        expect(items).toEqual([]);
    });

    test("handles strings with escape sequences", async () => {
        const json = '{"text":"Hello\\nWorld\\t!"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const text = await withTimeout(jsonStream.get<string>("text"), 1000);

        expect(text).toBe("Hello\nWorld\t!");
    });

    test("handles unicode and emoji", async () => {
        const json = '{"emoji":"Hello 🌍 World! 你好"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const emoji = await withTimeout(jsonStream.get<string>("emoji"), 1000);

        expect(emoji).toBe("Hello 🌍 World! 你好");
    });

    test("handles negative numbers", async () => {
        const json = '{"value":-42}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const value = await withTimeout(jsonStream.get<number>("value"), 1000);

        expect(value).toBe(-42);
    });

    test("handles floating point numbers", async () => {
        const json = '{"value":3.14159}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const value = await withTimeout(jsonStream.get<number>("value"), 1000);

        expect(value).toBeCloseTo(3.14159);
    });

    test("handles scientific notation", async () => {
        const json = '{"value":1.5e10}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 4,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const value = await withTimeout(jsonStream.get<number>("value"), 1000);

        expect(value).toBe(1.5e10);
    });

    test("dispose() cleans up resources", async () => {
        const json = '{"name":"Alice"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 100,
        });

        const jsonStream = JsonStream.parse(stream);
        await jsonStream.dispose();

        // After dispose, accessing properties should throw
        expect(() => jsonStream.get("name")).toThrow(
            "JsonStream has been disposed",
        );
    });
});

// ============================================================================
// Streaming Behavior Tests
// ============================================================================

describe("Streaming Behavior", () => {
    test("emits string chunks as they arrive", async () => {
        const json = '{"text":"This is a long string that will be chunked"}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 3,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const chunks: string[] = [];

        await withTimeout(
            (async () => {
                for await (const chunk of jsonStream.get<string>("text")) {
                    chunks.push(chunk);
                }
            })(),
            3000,
        );

        // Should have multiple chunks
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.join("")).toBe(
            "This is a long string that will be chunked",
        );
    });

    test("emits array snapshots as elements complete", async () => {
        const json = '{"items":["a","b","c"]}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const snapshots: string[][] = [];

        await withTimeout(
            (async () => {
                for await (
                    const snapshot of jsonStream.get<string[]>("items")
                ) {
                    snapshots.push([...snapshot]);
                }
            })(),
            2000,
        );

        // Should have progressive snapshots
        expect(snapshots.length).toBeGreaterThan(0);
        // Final snapshot should have all items
        expect(snapshots[snapshots.length - 1]).toEqual(["a", "b", "c"]);
    });

    test("emits object snapshots as properties complete", async () => {
        const json = '{"user":{"name":"Alice","age":30}}';
        const stream = streamTextInChunks({
            text: json,
            chunkSize: 5,
            interval: 10,
        });

        const jsonStream = JsonStream.parse(stream);
        const snapshots: object[] = [];

        await withTimeout(
            (async () => {
                for await (const snapshot of jsonStream.get<object>("user")) {
                    snapshots.push({ ...snapshot });
                }
            })(),
            2000,
        );

        // Should have progressive snapshots
        expect(snapshots.length).toBeGreaterThan(0);
        // Final snapshot should have all properties
        expect(snapshots[snapshots.length - 1]).toEqual({
            name: "Alice",
            age: 30,
        });
    });
});

// ============================================================================
// Backward Compatibility Tests
// Backward Compatibility tests removed - type-specific methods have been removed from API
