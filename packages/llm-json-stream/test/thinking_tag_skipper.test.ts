import { describe, expect, test } from "@jest/globals";
import { JsonStream, streamTextInChunks } from "../src/index.js";
import { ParseEvent } from "../src/index.js";

describe("Thinking Tag Skipper", () => {
    test("should skip standard think tags before root JSON", async () => {
        const input =
            "<think>This is my internal reasoning process.</think>\n{ \"message\": \"Hello, world!\" }";

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 5,
        });
        const parser = JsonStream.parse(stream, { skipThoughts: true });

        const message = await parser.get<string>("message");
        expect(message).toBe("Hello, world!");

        parser.dispose();
    });

    test("should skip custom thinking tags", async () => {
        const input =
            "<reasoning>This is custom reasoning.</reasoning>\n{ \"message\": \"Hello!\" }";

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 5,
        });
        const parser = JsonStream.parse(stream, {
            skipThoughts: true,
            thinkingTags: ["<reasoning>", "</reasoning>"],
        });

        const message = await parser.get<string>("message");
        expect(message).toBe("Hello!");

        parser.dispose();
    });

    test("should not skip thoughts when skipThoughts is false", async () => {
        const input =
            "<think>This is reasoning.</think>\n{ \"message\": \"Hello!\" }";

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 5,
        });
        const parser = JsonStream.parse(stream, { skipThoughts: false });

        try {
            await parser.get<string>("message");
        } catch (error: any) {
            expect(error.message).toContain("Stream ended before property was found");
        }

        parser.dispose();
    });

    test("should not drop characters on partial thinking tag mismatch inside JSON string", async () => {
        const input = '{"text": "I love <the color and <thi is nice"}';

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 5,
        });
        const parser = JsonStream.parse(stream, { skipThoughts: true });

        const text = await parser.get<string>("text");
        expect(text).toBe("I love <the color and <thi is nice");

        parser.dispose();
    });

    test("should skip thinking tags containing JSON-like characters", async () => {
        const input =
            "<think>\n{\n  \"nested\": [1, 2, 3]\n}\n</think>\n{ \"real\": true }";

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 5,
        });
        const parser = JsonStream.parse(stream, { skipThoughts: true });

        const real = await parser.get<boolean>("real");
        expect(real).toBe(true);

        parser.dispose();
    });

    test("should emit thinkingTagStart and thinkingTagEnd events in onLog", async () => {
        const input =
            "<think>reasoning</think>{ \"real\": true }";

        const stream = streamTextInChunks({
            text: input,
            chunkSize: 5,
            interval: 5,
        });

        const events: ParseEvent[] = [];
        const parser = JsonStream.parse(stream, {
            skipThoughts: true,
            onLog: (event) => {
                events.push(event);
            },
        });

        await parser.get<boolean>("real");

        const startEvent = events.find((e) => e.type === "thinkingTagStart");
        const endEvent = events.find((e) => e.type === "thinkingTagEnd");

        expect(startEvent).toBeDefined();
        expect(startEvent?.message).toBe("Entered thinking tags");
        expect(endEvent).toBeDefined();
        expect(endEvent?.message).toBe("Exited thinking tags");

        parser.dispose();
    });
});
