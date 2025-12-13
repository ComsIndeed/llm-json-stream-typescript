export function streamTextInChunks(text: String, chunkSize = 5, interval = 50) {
    async function* generator() {
        let i = 0;

        while (i < text.length) {
            // Slice the next chunk
            const chunk = text.slice(i, i + chunkSize);
            i += chunkSize;

            yield chunk;

            // Wait for the interval unless we're done
            if (i < text.length) {
                await new Promise((res) => setTimeout(res, interval));
            }
        }
    }

    return generator();
}
