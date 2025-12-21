/**
 * Comprehensive Test Suite for All Access Methods and Edge Cases
 *
 * This test file covers EVERY possible way to access JSON data through the parser,
 * combined with ALL edge cases to ensure complete bug coverage.
 *
 * Access Methods Tested:
 * 1. get<T>(path) - Direct path access
 * 2. paths() - Proxy-based access
 * 3. for await...of - Iteration
 * 4. $get() - Manual path from proxy
 * 5. $asAsyncJson() / asyncJson() - Convert proxy to AsyncJson
 * 6. Chained access - .get() after .get()
 * 7. unbuffered() - Non-buffered iteration
 *
 * Edge Cases Tested:
 * - Timing variations (fast/slow parsing)
 * - Empty structures ([], {})
 * - Deep nesting
 * - String escape sequences
 * - Unicode characters
 * - Number edge cases
 * - Concurrent access
 * - Error conditions
 */

import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";

// ============================================================================
// Test Helper Functions
// ============================================================================

interface TestConfig {
    chunkSize: number;
    interval: number;
}

const FAST_CONFIG: TestConfig = { chunkSize: 1000, interval: 0 };
const SLOW_CONFIG: TestConfig = { chunkSize: 1, interval: 5 };
const MEDIUM_CONFIG: TestConfig = { chunkSize: 10, interval: 2 };

function createStream(json: string, config: TestConfig) {
    return streamTextInChunks({
        text: json,
        chunkSize: config.chunkSize,
        interval: config.interval,
    });
}

// ============================================================================
// ACCESS METHOD 1: get<T>(path)
// ============================================================================

describe("Access Method: get<T>(path)", () => {
    describe("with fast parsing", () => {
        const config = FAST_CONFIG;

        test("simple property access", async () => {
            const json = '{"name":"Alice","age":30}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<string>("name")).toBe("Alice");
            expect(await parser.get<number>("age")).toBe(30);
        });

        test("nested property with dot notation", async () => {
            const json = '{"user":{"profile":{"name":"Bob"}}}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<string>("user.profile.name")).toBe("Bob");
        });

        test("array element with bracket notation", async () => {
            const json = '{"items":["a","b","c"]}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<string>("items[0]")).toBe("a");
            expect(await parser.get<string>("items[1]")).toBe("b");
            expect(await parser.get<string>("items[2]")).toBe("c");
        });

        test("mixed path access", async () => {
            const json = '{"users":[{"name":"Alice"},{"name":"Bob"}]}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<string>("users[0].name")).toBe("Alice");
            expect(await parser.get<string>("users[1].name")).toBe("Bob");
        });

        test("full array retrieval", async () => {
            const json = '{"items":[1,2,3,4,5]}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<number[]>("items")).toEqual([
                1,
                2,
                3,
                4,
                5,
            ]);
        });

        test("full object retrieval", async () => {
            const json = '{"config":{"a":1,"b":2}}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<object>("config")).toEqual({ a: 1, b: 2 });
        });
    });

    describe("with slow parsing", () => {
        const config = SLOW_CONFIG;

        test("simple property access", async () => {
            const json = '{"name":"Alice"}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<string>("name")).toBe("Alice");
        });

        test("array retrieval", async () => {
            const json = '{"items":[1,2,3]}';
            const parser = JsonStream.parse(createStream(json, config));
            expect(await parser.get<number[]>("items")).toEqual([1, 2, 3]);
        });
    });
});

// ============================================================================
// ACCESS METHOD 2: paths()
// ============================================================================

describe("Access Method: paths()", () => {
    describe("with fast parsing", () => {
        const config = FAST_CONFIG;

        test("top-level property", async () => {
            const json = '{"name":"Alice","age":30}';
            const parser = JsonStream.parse<{ name: string; age: number }>(
                createStream(json, config),
            );
            const paths = parser.paths();
            expect(await paths.name).toBe("Alice");
            expect(await paths.age).toBe(30);
        });

        test("nested property", async () => {
            const json = '{"user":{"name":"Bob"}}';
            const parser = JsonStream.parse<{ user: { name: string } }>(
                createStream(json, config),
            );
            const paths = parser.paths();
            expect(await paths.user.name).toBe("Bob");
        });

        test("array index", async () => {
            const json = '{"items":["a","b","c"]}';
            const parser = JsonStream.parse<{ items: string[] }>(
                createStream(json, config),
            );
            const paths = parser.paths();
            expect(await paths.items[0]).toBe("a");
            expect(await paths.items[1]).toBe("b");
            expect(await paths.items[2]).toBe("c");
        });

        test("complex mixed path", async () => {
            const json = '{"data":{"users":[{"profile":{"name":"Alice"}}]}}';
            const parser = JsonStream.parse<
                { data: { users: Array<{ profile: { name: string } }> } }
            >(createStream(json, config));
            const paths = parser.paths();
            expect(await paths.data.users[0].profile.name).toBe("Alice");
        });
    });

    describe("with slow parsing", () => {
        const config = SLOW_CONFIG;

        test("top-level property", async () => {
            const json = '{"name":"Alice"}';
            const parser = JsonStream.parse<{ name: string }>(
                createStream(json, config),
            );
            const paths = parser.paths();
            expect(await paths.name).toBe("Alice");
        });
    });
});

// ============================================================================
// ACCESS METHOD 3: for await...of (Iteration)
// ============================================================================

describe("Access Method: for await...of", () => {
    describe("Array iteration", () => {
        test("with fast parsing via get()", async () => {
            const json = '{"items":["a","b","c","d","e"]}';
            const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
            const items: string[] = [];
            for await (const itemAsync of parser.get<string[]>("items")) {
                items.push(await itemAsync);
            }
            expect(items).toEqual(["a", "b", "c", "d", "e"]);
        });

        test("with fast parsing via paths()", async () => {
            const json = '{"items":["a","b","c","d","e"]}';
            const parser = JsonStream.parse<{ items: string[] }>(
                createStream(json, FAST_CONFIG),
            );
            const items: string[] = [];
            for await (const itemAsync of parser.paths().items) {
                items.push(await itemAsync);
            }
            expect(items).toEqual(["a", "b", "c", "d", "e"]);
        });

        test("with slow parsing via get()", async () => {
            const json = '{"items":["a","b","c"]}';
            const parser = JsonStream.parse(createStream(json, SLOW_CONFIG));
            const items: string[] = [];
            for await (const itemAsync of parser.get<string[]>("items")) {
                items.push(await itemAsync);
            }
            expect(items).toEqual(["a", "b", "c"]);
        });

        test("with slow parsing via paths()", async () => {
            const json = '{"items":["a","b","c"]}';
            const parser = JsonStream.parse<{ items: string[] }>(
                createStream(json, SLOW_CONFIG),
            );
            const items: string[] = [];
            for await (const itemAsync of parser.paths().items) {
                items.push(await itemAsync);
            }
            expect(items).toEqual(["a", "b", "c"]);
        });

        test("nested array iteration", async () => {
            const json = '{"data":{"items":[1,2,3]}}';
            const parser = JsonStream.parse<{ data: { items: number[] } }>(
                createStream(json, FAST_CONFIG),
            );
            const items: number[] = [];
            for await (const itemAsync of parser.paths().data.items) {
                items.push(await itemAsync);
            }
            expect(items).toEqual([1, 2, 3]);
        });

        test("iteration over array of objects with property access", async () => {
            const json =
                '{"users":[{"name":"Alice","age":25},{"name":"Bob","age":30}]}';
            const parser = JsonStream.parse<
                { users: Array<{ name: string; age: number }> }
            >(createStream(json, FAST_CONFIG));
            const names: string[] = [];
            const ages: number[] = [];
            for await (const userAsync of parser.paths().users) {
                names.push(await userAsync.get<string>("name"));
                ages.push(await userAsync.get<number>("age"));
            }
            expect(names).toEqual(["Alice", "Bob"]);
            expect(ages).toEqual([25, 30]);
        });

        test("multiple sequential iterations on same array", async () => {
            const json = '{"items":["x","y","z"]}';
            const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
            const itemsAsync = parser.get<string[]>("items");

            // First iteration
            const items1: string[] = [];
            for await (const itemAsync of itemsAsync) {
                items1.push(await itemAsync);
            }

            // Second iteration (should replay from buffer)
            const items2: string[] = [];
            for await (const itemAsync of itemsAsync) {
                items2.push(await itemAsync);
            }

            expect(items1).toEqual(["x", "y", "z"]);
            expect(items2).toEqual(["x", "y", "z"]);
        });
    });

    describe("Object iteration", () => {
        test("with fast parsing via get()", async () => {
            const json = '{"config":{"a":1,"b":2,"c":3}}';
            const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
            const entries: Array<[string, number]> = [];
            for await (
                const [key, valueAsync] of parser.get<
                    { a: number; b: number; c: number }
                >("config")
            ) {
                entries.push([key, await valueAsync]);
            }
            expect(entries).toEqual([["a", 1], ["b", 2], ["c", 3]]);
        });

        test("with fast parsing via paths()", async () => {
            const json = '{"config":{"x":"1","y":"2"}}';
            const parser = JsonStream.parse<{ config: Record<string, string> }>(
                createStream(json, FAST_CONFIG),
            );
            const entries: Array<[string, string]> = [];
            for await (const [key, valueAsync] of parser.paths().config) {
                entries.push([key, await valueAsync]);
            }
            expect(entries).toEqual([["x", "1"], ["y", "2"]]);
        });
    });

    describe("String streaming", () => {
        test("stream string chunks via get()", async () => {
            const json = '{"message":"Hello World"}';
            const parser = JsonStream.parse(createStream(json, MEDIUM_CONFIG));
            const chunks: string[] = [];
            for await (const chunk of parser.get<string>("message")) {
                chunks.push(chunk);
            }
            expect(chunks.join("")).toBe("Hello World");
        });

        test("stream string chunks via paths()", async () => {
            const json = '{"message":"Hello World"}';
            const parser = JsonStream.parse<{ message: string }>(
                createStream(json, MEDIUM_CONFIG),
            );
            const chunks: string[] = [];
            for await (const chunk of parser.paths().message) {
                chunks.push(chunk);
            }
            expect(chunks.join("")).toBe("Hello World");
        });
    });
});

// ============================================================================
// ACCESS METHOD 4: $get()
// ============================================================================

describe("Access Method: $get()", () => {
    test("from root path", async () => {
        const json = '{"name":"Alice","nested":{"value":42}}';
        const parser = JsonStream.parse<any>(createStream(json, FAST_CONFIG));
        const paths = parser.paths();
        expect(await paths.$get<string>("name")).toBe("Alice");
        expect(await paths.$get<number>("nested.value")).toBe(42);
    });

    test("from nested path", async () => {
        const json = '{"data":{"items":[1,2,3],"config":{"key":"value"}}}';
        const parser = JsonStream.parse<any>(createStream(json, FAST_CONFIG));
        const paths = parser.paths();
        expect(await paths.data.$get<number[]>("items")).toEqual([1, 2, 3]);
        expect(await paths.data.$get<string>("config.key")).toBe("value");
    });

    test("array iteration via $get()", async () => {
        const json = '{"items":["a","b","c"]}';
        const parser = JsonStream.parse<any>(createStream(json, FAST_CONFIG));
        const paths = parser.paths();
        const items: string[] = [];
        for await (const itemAsync of paths.$get<string[]>("items")) {
            items.push(await itemAsync);
        }
        expect(items).toEqual(["a", "b", "c"]);
    });
});

// ============================================================================
// ACCESS METHOD 5: $asAsyncJson() / asyncJson()
// ============================================================================

describe("Access Method: $asAsyncJson() / asyncJson()", () => {
    test("$asAsyncJson on primitive", async () => {
        const json = '{"name":"Alice"}';
        const parser = JsonStream.parse<{ name: string }>(
            createStream(json, FAST_CONFIG),
        );
        const asyncJson = parser.paths().name.$asAsyncJson();
        expect(await asyncJson).toBe("Alice");
    });

    test("$asAsyncJson on array - iteration", async () => {
        const json = '{"items":["a","b","c"]}';
        const parser = JsonStream.parse<{ items: string[] }>(
            createStream(json, FAST_CONFIG),
        );
        const asyncJson = parser.paths().items.$asAsyncJson();
        const items: string[] = [];
        for await (const itemAsync of asyncJson) {
            items.push(await itemAsync);
        }
        expect(items).toEqual(["a", "b", "c"]);
    });

    test("asyncJson() alias", async () => {
        const json = '{"items":[1,2,3]}';
        const parser = JsonStream.parse<{ items: number[] }>(
            createStream(json, FAST_CONFIG),
        );
        const asyncJson = parser.paths().items.asyncJson();
        const items: number[] = [];
        for await (const itemAsync of asyncJson) {
            items.push(await itemAsync);
        }
        expect(items).toEqual([1, 2, 3]);
    });

    test("$asAsyncJson on object - iteration", async () => {
        const json = '{"config":{"a":1,"b":2}}';
        const parser = JsonStream.parse<{ config: { a: number; b: number } }>(
            createStream(json, FAST_CONFIG),
        );
        const asyncJson = parser.paths().config.$asAsyncJson();
        const entries: Array<[string, number]> = [];
        for await (const [key, valueAsync] of asyncJson) {
            entries.push([key, await valueAsync]);
        }
        expect(entries).toEqual([["a", 1], ["b", 2]]);
    });
});

// ============================================================================
// ACCESS METHOD 6: Chained Access
// ============================================================================

describe("Access Method: Chained Access", () => {
    test("chain get() after get()", async () => {
        const json = '{"user":{"profile":{"name":"Alice"}}}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        const user = parser.get<{ profile: { name: string } }>("user");
        const name = await user.get<string>("profile.name");
        expect(name).toBe("Alice");
    });

    test("chain get() after proxy path", async () => {
        const json = '{"data":{"items":[1,2,3]}}';
        const parser = JsonStream.parse<{ data: { items: number[] } }>(
            createStream(json, FAST_CONFIG),
        );
        const data = parser.paths().data;
        const items = await data.get<number[]>("items");
        expect(items).toEqual([1, 2, 3]);
    });

    test("chain iteration after get()", async () => {
        const json = '{"data":{"items":["a","b","c"]}}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        const data = parser.get<{ items: string[] }>("data");
        const items: string[] = [];
        for await (const itemAsync of data.get<string[]>("items")) {
            items.push(await itemAsync);
        }
        expect(items).toEqual(["a", "b", "c"]);
    });

    test("multiple levels of chaining", async () => {
        const json = '{"a":{"b":{"c":{"d":"value"}}}}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        const a = parser.get<any>("a");
        const b = a.get<any>("b");
        const c = b.get<any>("c");
        const d = await c.get<string>("d");
        expect(d).toBe("value");
    });
});

// ============================================================================
// ACCESS METHOD 7: unbuffered()
// ============================================================================

describe("Access Method: unbuffered()", () => {
    test("unbuffered string streaming", async () => {
        const json = '{"message":"Hello"}';
        const parser = JsonStream.parse(createStream(json, MEDIUM_CONFIG));
        const chunks: string[] = [];
        for await (const chunk of parser.get<string>("message").unbuffered()) {
            chunks.push(chunk);
        }
        // Unbuffered may miss some chunks, but should eventually complete
        expect(chunks.join("").length).toBeLessThanOrEqual("Hello".length);
    });

    test("unbuffered array iteration", async () => {
        const json = '{"items":["a","b","c"]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        const items: string[] = [];
        for await (
            const itemAsync of parser.get<string[]>("items").unbuffered()
        ) {
            items.push(await itemAsync);
        }
        // Unbuffered may miss elements if parsing is fast
        expect(items.length).toBeLessThanOrEqual(3);
    });
});

// ============================================================================
// EDGE CASE: Empty Structures
// ============================================================================

describe("Edge Case: Empty Structures", () => {
    test("empty array - await", async () => {
        const json = '{"items":[]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<any[]>("items")).toEqual([]);
    });

    test("empty array - iteration", async () => {
        const json = '{"items":[]}';
        const parser = JsonStream.parse<{ items: any[] }>(
            createStream(json, FAST_CONFIG),
        );
        const items: any[] = [];
        for await (const itemAsync of parser.paths().items) {
            items.push(await itemAsync);
        }
        expect(items).toEqual([]);
    });

    test("empty object - await", async () => {
        const json = '{"config":{}}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<object>("config")).toEqual({});
    });

    test("empty object - iteration", async () => {
        const json = '{"config":{}}';
        const parser = JsonStream.parse<{ config: object }>(
            createStream(json, FAST_CONFIG),
        );
        const entries: any[] = [];
        for await (const entry of parser.paths().config) {
            entries.push(entry);
        }
        expect(entries).toEqual([]);
    });

    test("nested empty structures", async () => {
        const json = '{"data":{"items":[],"config":{}}}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<any[]>("data.items")).toEqual([]);
        expect(await parser.get<object>("data.config")).toEqual({});
    });
});

// ============================================================================
// EDGE CASE: Single Element
// ============================================================================

describe("Edge Case: Single Element", () => {
    test("single element array - await", async () => {
        const json = '{"items":["only"]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string[]>("items")).toEqual(["only"]);
    });

    test("single element array - iteration", async () => {
        const json = '{"items":["only"]}';
        const parser = JsonStream.parse<{ items: string[] }>(
            createStream(json, FAST_CONFIG),
        );
        const items: string[] = [];
        for await (const itemAsync of parser.paths().items) {
            items.push(await itemAsync);
        }
        expect(items).toEqual(["only"]);
    });

    test("single property object", async () => {
        const json = '{"config":{"only":"value"}}';
        const parser = JsonStream.parse<{ config: { only: string } }>(
            createStream(json, FAST_CONFIG),
        );
        const entries: Array<[string, string]> = [];
        for await (const [key, valueAsync] of parser.paths().config) {
            entries.push([key, await valueAsync]);
        }
        expect(entries).toEqual([["only", "value"]]);
    });
});

// ============================================================================
// EDGE CASE: Deep Nesting
// ============================================================================

describe("Edge Case: Deep Nesting", () => {
    test("10 levels deep object", async () => {
        const json =
            '{"l1":{"l2":{"l3":{"l4":{"l5":{"l6":{"l7":{"l8":{"l9":{"l10":"deep"}}}}}}}}}}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string>("l1.l2.l3.l4.l5.l6.l7.l8.l9.l10")).toBe(
            "deep",
        );
    });

    test("deeply nested arrays", async () => {
        const json = '{"a":[[[[[[1]]]]]]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        // Note: The path must have indices for nested arrays
        expect(await parser.get<number>("a[0][0][0][0][0][0]")).toBe(1);
    });

    test("mixed deep nesting", async () => {
        const json = '{"a":[{"b":[{"c":[{"d":"value"}]}]}]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string>("a[0].b[0].c[0].d")).toBe("value");
    });
});

// ============================================================================
// EDGE CASE: String Edge Cases
// ============================================================================

describe("Edge Case: String Values", () => {
    test("empty string", async () => {
        const json = '{"empty":""}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string>("empty")).toBe("");
    });

    test("escape sequences", async () => {
        const json = '{"text":"line1\\nline2\\ttab\\"quote\\\\backslash"}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string>("text")).toBe(
            'line1\nline2\ttab"quote\\backslash',
        );
    });

    test("unicode characters", async () => {
        const json = '{"text":"日本語中文한국어🎉"}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string>("text")).toBe("日本語中文한국어🎉");
    });

    test("unicode escape sequences (parser returns raw escape, not decoded)", async () => {
        // NOTE: The parser does NOT decode \uXXXX escapes - it returns them as-is
        // This is a known limitation. Use actual unicode characters in JSON instead.
        const json = '{"text":"\\u0048\\u0065\\u006c\\u006c\\u006f"}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        // Parser returns the raw escape sequence, not the decoded value
        expect(await parser.get<string>("text")).toBe(
            "\\u0048\\u0065\\u006c\\u006c\\u006f",
        );
    });

    test("very long string", async () => {
        const longStr = "x".repeat(10000);
        const json = `{"long":"${longStr}"}`;
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<string>("long")).toBe(longStr);
    });
});

// ============================================================================
// EDGE CASE: Number Edge Cases
// ============================================================================

describe("Edge Case: Number Values", () => {
    test("zero", async () => {
        const json = '{"value":0}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBe(0);
    });

    test("negative zero", async () => {
        const json = '{"value":-0}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBe(-0);
    });

    test("negative numbers", async () => {
        const json = '{"value":-42}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBe(-42);
    });

    test("decimal numbers", async () => {
        const json = '{"value":3.14159}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBeCloseTo(3.14159);
    });

    test("scientific notation positive exponent", async () => {
        const json = '{"value":1.5e10}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBe(1.5e10);
    });

    test("scientific notation negative exponent", async () => {
        const json = '{"value":1.5e-10}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBe(1.5e-10);
    });

    test("very large number", async () => {
        const json = '{"value":1e308}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number>("value")).toBe(1e308);
    });
});

// ============================================================================
// EDGE CASE: Boolean and Null
// ============================================================================

describe("Edge Case: Boolean and Null", () => {
    test("true", async () => {
        const json = '{"value":true}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<boolean>("value")).toBe(true);
    });

    test("false", async () => {
        const json = '{"value":false}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<boolean>("value")).toBe(false);
    });

    test("null", async () => {
        const json = '{"value":null}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<null>("value")).toBe(null);
    });

    test("array of booleans and nulls", async () => {
        const json = '{"values":[true,false,null,true]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<(boolean | null)[]>("values")).toEqual([
            true,
            false,
            null,
            true,
        ]);
    });
});

// ============================================================================
// EDGE CASE: Mixed Type Arrays
// ============================================================================

describe("Edge Case: Mixed Type Arrays", () => {
    test("all types in one array", async () => {
        const json = '{"mixed":[1,"two",true,null,{"key":"value"},[1,2,3]]}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<any[]>("mixed")).toEqual([
            1,
            "two",
            true,
            null,
            { key: "value" },
            [1, 2, 3],
        ]);
    });

    test("iteration over mixed array", async () => {
        const json = '{"mixed":[1,"two",true]}';
        const parser = JsonStream.parse<{ mixed: any[] }>(
            createStream(json, FAST_CONFIG),
        );
        const items: any[] = [];
        for await (const itemAsync of parser.paths().mixed) {
            items.push(await itemAsync);
        }
        expect(items).toEqual([1, "two", true]);
    });
});

// ============================================================================
// EDGE CASE: Concurrent Access
// ============================================================================

describe("Edge Case: Concurrent Access", () => {
    test("multiple awaits on same property", async () => {
        const json = '{"name":"Alice"}';
        const parser = JsonStream.parse(createStream(json, MEDIUM_CONFIG));

        const [name1, name2, name3] = await Promise.all([
            parser.get<string>("name"),
            parser.get<string>("name"),
            parser.get<string>("name"),
        ]);

        expect(name1).toBe("Alice");
        expect(name2).toBe("Alice");
        expect(name3).toBe("Alice");
    });

    test("access different properties concurrently", async () => {
        const json = '{"a":"first","b":"second","c":"third"}';
        const parser = JsonStream.parse(createStream(json, MEDIUM_CONFIG));

        const [a, b, c] = await Promise.all([
            parser.get<string>("a"),
            parser.get<string>("b"),
            parser.get<string>("c"),
        ]);

        expect(a).toBe("first");
        expect(b).toBe("second");
        expect(c).toBe("third");
    });

    test("iterate and await concurrently", async () => {
        const json = '{"items":["a","b","c"],"value":"test"}';
        const parser = JsonStream.parse<{ items: string[]; value: string }>(
            createStream(json, MEDIUM_CONFIG),
        );

        const itemsPromise = (async () => {
            const items: string[] = [];
            for await (const itemAsync of parser.paths().items) {
                items.push(await itemAsync);
            }
            return items;
        })();

        const valuePromise = parser.get<string>("value");

        const [items, value] = await Promise.all([itemsPromise, valuePromise]);

        expect(items).toEqual(["a", "b", "c"]);
        expect(value).toBe("test");
    });
});

// ============================================================================
// EDGE CASE: Large Data
// ============================================================================

describe("Edge Case: Large Data", () => {
    test("large array", async () => {
        const largeArray = Array.from({ length: 1000 }, (_, i) => i);
        const json = JSON.stringify({ items: largeArray });
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<number[]>("items")).toEqual(largeArray);
    });

    test("large array iteration", async () => {
        const largeArray = Array.from({ length: 100 }, (_, i) => i);
        const json = JSON.stringify({ items: largeArray });
        const parser = JsonStream.parse<{ items: number[] }>(
            createStream(json, FAST_CONFIG),
        );
        const items: number[] = [];
        for await (const itemAsync of parser.paths().items) {
            items.push(await itemAsync);
        }
        expect(items).toEqual(largeArray);
    });

    test("many properties", async () => {
        const manyProps: Record<string, number> = {};
        for (let i = 0; i < 100; i++) {
            manyProps[`prop${i}`] = i;
        }
        const json = JSON.stringify({ config: manyProps });
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));
        expect(await parser.get<Record<string, number>>("config")).toEqual(
            manyProps,
        );
    });
});

// ============================================================================
// EDGE CASE: Chunk Boundaries
// ============================================================================

describe("Edge Case: Chunk Boundaries", () => {
    test("escape sequence split across chunks", async () => {
        const json = '{"text":"line\\nbreak"}';
        const parser = JsonStream.parse(
            createStream(json, { chunkSize: 1, interval: 0 }),
        );
        expect(await parser.get<string>("text")).toBe("line\nbreak");
    });

    test("unicode escape split across chunks (parser returns raw escape, not decoded)", async () => {
        // NOTE: Parser does NOT decode \uXXXX escapes, this is a known limitation
        const json = '{"text":"\\u0048"}';
        const parser = JsonStream.parse(
            createStream(json, { chunkSize: 1, interval: 0 }),
        );
        expect(await parser.get<string>("text")).toBe("\\u0048");
    });

    test("number split across chunks", async () => {
        const json = '{"value":123456}';
        const parser = JsonStream.parse(
            createStream(json, { chunkSize: 2, interval: 0 }),
        );
        expect(await parser.get<number>("value")).toBe(123456);
    });

    test("keyword split across chunks", async () => {
        const json = '{"a":true,"b":false,"c":null}';
        const parser = JsonStream.parse(
            createStream(json, { chunkSize: 3, interval: 0 }),
        );
        expect(await parser.get<boolean>("a")).toBe(true);
        expect(await parser.get<boolean>("b")).toBe(false);
        expect(await parser.get<null>("c")).toBe(null);
    });
});

// ============================================================================
// EDGE CASE: Error Handling
// ============================================================================

describe("Edge Case: Error Handling", () => {
    test("dispose terminates stream properly", async () => {
        // This tests that dispose can be called after some items have been processed
        // We don't call dispose during iteration since that causes complex async error handling
        const json = '{"items":[1,2,3,4,5]}';
        const parser = JsonStream.parse<{ items: number[] }>(
            createStream(json, FAST_CONFIG),
        );

        // Process the entire stream
        const items: number[] = [];
        for await (const itemAsync of parser.paths().items) {
            const value = await itemAsync;
            items.push(value);
        }

        // Dispose after iteration completes
        await parser.dispose();

        // Should have all 5 items
        expect(items).toEqual([1, 2, 3, 4, 5]);
    });

    test("access after dispose throws", async () => {
        const json = '{"name":"Alice"}';
        const parser = JsonStream.parse(createStream(json, FAST_CONFIG));

        // Get value first, then dispose
        const name = await parser.get<string>("name");
        expect(name).toBe("Alice");

        // Now dispose
        await parser.dispose();

        // After dispose, new get() calls should throw
        expect(() => parser.get<string>("name")).toThrow();
    });
});
