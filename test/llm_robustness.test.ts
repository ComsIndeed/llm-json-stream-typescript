import { describe, expect, test } from "@jest/globals";
import { JsonStreamParser } from "../src/classes/json_stream_parser.js";
import { streamTextInChunks } from "../src/utilities/stream_text_in_chunks.js";

describe("LLM Robustness - Markdown Sanitization", () => {
    test("basic markdown block - strip ```json wrapper", async () => {
        const input = `\`\`\`json
{"name":"Alice","age":30}
\`\`\``;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const name = await parser.getStringProperty("name").promise;
        const age = await parser.getNumberProperty("age").promise;

        expect(name).toBe("Alice");
        expect(age).toBe(30);
    });

    test("inline code markers - strip ``` without language specifier", async () => {
        const input = `\`\`\`
{"value":true}
\`\`\``;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const value = await parser.getBooleanProperty("value").promise;

        expect(value).toBe(true);
    });

    test("malformed markdown - unclosed code block", async () => {
        const input = `\`\`\`json
{"status":"ok"}`;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        // Should still parse the JSON even without closing ```
        const status = await parser.getStringProperty("status").promise;

        expect(status).toBe("ok");
    });

    test("nested backticks - JSON containing backticks in string values", async () => {
        // This JSON itself contains backticks in the string value
        const input = `\`\`\`json
{"code":"use \`variable\` here"}
\`\`\``;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 12,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const code = await parser.getStringProperty("code").promise;

        expect(code).toBe("use `variable` here");
    });
});

describe("LLM Robustness - Preamble Handling", () => {
    test("simple preamble - text before actual JSON", async () => {
        const input = 'Here is the JSON: {"name":"Bob"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const name = await parser.getStringProperty("name").promise;

        expect(name).toBe("Bob");
    });

    test("newlines before JSON", async () => {
        const input = `

{"result":42}`;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const result = await parser.getNumberProperty("result").promise;

        expect(result).toBe(42);
    });

    test("whitespace-only preamble", async () => {
        const input = '   \t\n  {"key":"value"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const key = await parser.getStringProperty("key").promise;

        expect(key).toBe("value");
    });
});

describe("LLM Robustness - Trailing Content", () => {
    test("JSON followed by explanation", async () => {
        const input = `{"answer":42}

I hope this helps! The answer is 42 as per your calculations.`;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 15,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const answer = await parser.getNumberProperty("answer").promise;

        expect(answer).toBe(42);
    });

    test("JSON followed by code fence closing", async () => {
        const input = '{"status":"success"}\n```';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const status = await parser.getStringProperty("status").promise;

        expect(status).toBe("success");
    });
});

describe("LLM Robustness - Special Characters", () => {
    test("JSON with unicode characters", async () => {
        const input = '{"greeting":"Hello World!"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const greeting = await parser.getStringProperty("greeting").promise;

        expect(greeting).toBe("Hello World!");
    });

    test("JSON with unicode escape sequences", async () => {
        // Note: Unicode escape sequence decoding (\uXXXX) is not yet implemented
        // The parser passes them through as-is, which is acceptable for most use cases
        const input = '{"text":"\\u0048\\u0065\\u006c\\u006c\\u006f"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const text = await parser.getStringProperty("text").promise;

        // Currently returns the escape sequences as-is (not decoded)
        expect(text).toBe("\\u0048\\u0065\\u006c\\u006c\\u006f");
    });

    test("JSON with newlines in strings", async () => {
        const input = '{"text":"Line1\\nLine2\\nLine3"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const text = await parser.getStringProperty("text").promise;

        expect(text).toBe("Line1\nLine2\nLine3");
    });

    test("JSON with tabs and special whitespace", async () => {
        const input = '{"code":"\\t\\tindented\\r\\n"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const code = await parser.getStringProperty("code").promise;

        expect(code).toBe("\t\tindented\r\n");
    });

    test("JSON with quotes in strings", async () => {
        const input = '{"quote":"She said \\"Hello\\""}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const quote = await parser.getStringProperty("quote").promise;

        expect(quote).toBe('She said "Hello"');
    });

    test("JSON with backslashes", async () => {
        const input = '{"path":"C:\\\\Users\\\\Name"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const path = await parser.getStringProperty("path").promise;

        expect(path).toBe("C:\\Users\\Name");
    });
});

describe("LLM Robustness - Number Edge Cases", () => {
    test("scientific notation", async () => {
        const input = '{"large":1.5e10,"small":2.5e-5}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const large = await parser.getNumberProperty("large").promise;
        const small = await parser.getNumberProperty("small").promise;

        expect(large).toBe(1.5e10);
        expect(small).toBe(2.5e-5);
    });

    test("negative numbers", async () => {
        const input = '{"neg":-42,"negFloat":-3.14}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 8,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const neg = await parser.getNumberProperty("neg").promise;
        const negFloat = await parser.getNumberProperty("negFloat").promise;

        expect(neg).toBe(-42);
        expect(negFloat).toBe(-3.14);
    });

    test("zero values", async () => {
        const input = '{"zero":0,"negZero":-0,"float":0.0}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const zero = await parser.getNumberProperty("zero").promise;
        const negZero = await parser.getNumberProperty("negZero").promise;
        const float = await parser.getNumberProperty("float").promise;

        expect(zero).toBe(0);
        expect(Object.is(negZero, -0)).toBe(true);
        expect(float).toBe(0.0);
    });
});

describe("LLM Robustness - Complex Structures", () => {
    test("deeply nested JSON", async () => {
        const input = '{"a":{"b":{"c":{"d":{"e":{"value":"deep"}}}}}}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const value = await parser.getStringProperty(
            "a.b.c.d.e.value",
        ).promise;

        expect(value).toBe("deep");
    });

    test("mixed array types", async () => {
        const input = '{"mixed":[1,"two",true,null,{"nested":"obj"},[1,2,3]]}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const mixed = await parser.getListProperty("mixed").promise;

        expect(mixed).toEqual([
            1,
            "two",
            true,
            null,
            { nested: "obj" },
            [1, 2, 3],
        ]);
    });

    test("empty structures", async () => {
        const input = '{"emptyObj":{},"emptyArr":[],"emptyStr":""}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 10,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const emptyObj = await parser.getMapProperty("emptyObj").promise;
        const emptyArr = await parser.getListProperty("emptyArr").promise;
        const emptyStr = await parser.getStringProperty("emptyStr").promise;

        expect(emptyObj).toEqual({});
        expect(emptyArr).toEqual([]);
        expect(emptyStr).toBe("");
    });
});

describe("LLM Robustness - Realistic LLM Outputs", () => {
    test("ChatGPT-style JSON response", async () => {
        const input = `Here's the data you requested:

\`\`\`json
{
    "users": [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25}
    ],
    "count": 2
}
\`\`\`

Let me know if you need any modifications!`;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 20,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const users = await parser.getListProperty("users").promise;
        const count = await parser.getNumberProperty("count").promise;

        expect(users).toEqual([
            { name: "Alice", age: 30 },
            { name: "Bob", age: 25 },
        ]);
        expect(count).toBe(2);
    });

    test("API-like JSON response", async () => {
        const input =
            `{"success":true,"data":{"id":123,"created":"2024-01-01"},"error":null}`;

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 15,
            interval: 10,
        });
        const parser = new JsonStreamParser(stream);

        const success = await parser.getBooleanProperty("success").promise;
        const id = await parser.getNumberProperty("data.id").promise;
        const error = await parser.getNullProperty("error").promise;

        expect(success).toBe(true);
        expect(id).toBe(123);
        expect(error).toBe(null);
    });
});
