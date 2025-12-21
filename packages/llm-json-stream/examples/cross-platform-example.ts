/**
 * Cross-Platform Compatibility Example
 *
 * This example demonstrates how llm-json-stream works across all JavaScript runtimes
 * because it uses only AsyncIterable<string> - no Node.js stream module required!
 */

import { JsonStream, streamTextInChunks } from "../src/index.js";

// Example: Simulating an LLM response
const jsonResponse = JSON.stringify({
    title: "Building Cross-Platform Libraries",
    author: "AI Assistant",
    content:
        "Using async iterables ensures your code works everywhere: Node.js, Deno, Bun, browsers, and edge runtimes.",
    tags: ["javascript", "typescript", "cross-platform", "async"],
    metadata: {
        publishDate: "2024-12-11",
        readTime: 5,
    },
});

async function demonstrateCrossPlatform() {
    console.log("=== Cross-Platform JSON Streaming Example ===\n");

    // Create an async iterable that simulates streaming
    // This works identically in Node.js, Deno, Bun, browsers, etc.
    const stream = streamTextInChunks({
        text: jsonResponse,
        chunkSize: 10,
        interval: 50,
    });

    // Create the parser using the new JsonStream.parse() API
    const jsonStream = JsonStream.parse(stream);

    // Stream the title as it arrives (character by character)
    console.log("📝 Title (streaming):");
    process.stdout.write("   ");
    for await (const chunk of jsonStream.get<string>("title")) {
        process.stdout.write(chunk);
    }
    console.log("\n");

    // Get complete values
    const author = await jsonStream.get<string>("author");
    console.log(`👤 Author: ${author}\n`);

    // Stream array elements as they arrive
    console.log("🏷️  Tags:");
    const tags = await jsonStream.get<string[]>("tags");
    tags.forEach((tag, index) => {
        console.log(`   [${index}] ${tag}`);
    });

    // Access nested properties
    const readTime = await jsonStream.get<number>("metadata.readTime");
    console.log(`\n⏱️  Read time: ${readTime} minutes\n`);

    // Wait for stream to complete
    await jsonStream.dispose();

    console.log("✅ Done! This example works on:");
    console.log("   • Node.js (all versions with async iterators)");
    console.log("   • Deno");
    console.log("   • Bun");
    console.log("   • Browsers (with Web Streams adapter)");
    console.log("   • Cloudflare Workers");
    console.log("   • Any edge runtime\n");
}

// Run the example
demonstrateCrossPlatform().catch(console.error);
