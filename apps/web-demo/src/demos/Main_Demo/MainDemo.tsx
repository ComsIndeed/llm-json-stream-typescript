import { streamTextInChunks } from '../../utils/streamTextInChunks'
import { useEffect, useState, useRef } from 'react'
import { JsonStreamParser } from 'llm-json-stream'
import './MainDemo.css'
import { CodeBlock, dracula } from 'react-code-blocks'

const jsonExample = JSON.stringify({
    name: "Sample Item",
    description: "This is a very long description that could potentially span multiple lines and contain a lot of information about the item, including its features, benefits, and usage.",
    tags: [
        "sample tag 1 with some extra info",
        "sample tag 2 with more details",
        "sample tag 3 that is a bit longer"
    ],
    details: {
        color: "red",
        weight: "1.5kg"
    }
}, null, 2)

function MainDemo() {
    const [currentJson, setCurrentJson] = useState("")
    const [chunkSize, setChunkSize] = useState(23)
    const [intervalMs, setIntervalMs] = useState(50)
    const [isRunning, setIsRunning] = useState(false)

    const [nameStreamValue, setNameStreamValue] = useState("")
    const [descriptionStreamValue, setDescriptionStreamValue] = useState("")
    const [descriptionPromiseValue, setDescriptionPromiseValue] = useState("")
    const [tags, setTags] = useState<string[]>([])
    const [colorStreamValue, setColorStreamValue] = useState("")
    const [weightPromiseValue, setWeightPromiseValue] = useState("")

    const abortControllerRef = useRef<AbortController | null>(null)

    // Accumulator arrays for each listener
    const nameChunksRef = useRef<string[]>([])
    const descriptionChunksRef = useRef<string[]>([])
    const rawStreamChunksRef = useRef<string[]>([])
    const colorChunksRef = useRef<string[]>([])
    const tagsRef = useRef<string[]>([])
    const weightChunksRef = useRef<string[]>([])

    const startStream = () => {
        if (isRunning) return;
        setIsRunning(true);
        setCurrentJson("");

        // Reset UI values (otherwise repeated runs append)
        setNameStreamValue("")
        setDescriptionStreamValue("")
        setDescriptionPromiseValue("")
        setTags([])
        setColorStreamValue("")
        setWeightPromiseValue("")

        // Reset accumulator arrays
        nameChunksRef.current = []
        descriptionChunksRef.current = []
        rawStreamChunksRef.current = []
        colorChunksRef.current = []
        tagsRef.current = []
        weightChunksRef.current = []

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Create a stream from the JSON example.
        // IMPORTANT: async iterables are single-consumer.
        // We'll let the parser be the ONLY consumer, and we'll "tap" chunks for the UI.
        const baseStream = streamTextInChunks(jsonExample, chunkSize, intervalMs);

        async function* tappedStream() {
            for await (const chunk of baseStream) {
                if (abortControllerRef.current?.signal.aborted) break;
                rawStreamChunksRef.current.push(chunk)
                setCurrentJson(prev => prev + chunk)
                yield chunk
            }
        }

        const parser = new JsonStreamParser(tappedStream());

        const tasks: Promise<unknown>[] = []

        const nameProp = parser.getStringProperty("name")
        const descriptionProp = parser.getStringProperty("description")
        const colorProp = parser.getStringProperty("details.color")
        const weightProp = parser.getStringProperty("details.weight")
        const tagsProp = parser.getArrayProperty("tags")

        tasks.push((async () => {
            for await (const nameChunk of nameProp) {
                if (abortControllerRef.current?.signal.aborted) break;
                nameChunksRef.current.push(nameChunk);
                setNameStreamValue(prev => prev + nameChunk);
            }
        })());

        tasks.push((async () => {
            for await (const descriptionChunk of descriptionProp) {
                if (abortControllerRef.current?.signal.aborted) break;
                descriptionChunksRef.current.push(descriptionChunk);
                setDescriptionStreamValue(prev => prev + descriptionChunk);
            }
        })());

        tasks.push((async () => {
            try {
                const description = await descriptionProp.promise;
                if (!abortControllerRef.current?.signal.aborted) {
                    setDescriptionPromiseValue(description);
                }
            } catch (error) {
                console.error("Error fetching description:", error);
            }
        })());

        tasks.push((async () => {
            for await (const tag of tagsProp) {
                if (abortControllerRef.current?.signal.aborted) break;
                // The array property yields values; normalize to string for this demo.
                const tagStr = String(tag)
                tagsRef.current.push(tagStr);
                setTags(prev => [...prev, tagStr]);
            }
        })());

        tasks.push((async () => {
            for await (const colorChunk of colorProp) {
                if (abortControllerRef.current?.signal.aborted) break;
                colorChunksRef.current.push(colorChunk);
                setColorStreamValue(prev => prev + colorChunk);
            }
        })());

        tasks.push((async () => {
            try {
                // Note: promise resolves at end; accumulate the streaming chunks too.
                for await (const weightChunk of weightProp) {
                    if (abortControllerRef.current?.signal.aborted) break;
                    weightChunksRef.current.push(weightChunk);
                }

                const weight = await weightProp.promise;
                if (!abortControllerRef.current?.signal.aborted) {
                    setWeightPromiseValue(weight);
                }
            } catch (error) {
                console.error("Error fetching weight:", error);
            }
        })());

        // Final “done” log: wait for everything to settle.
        tasks.push((async () => {
            const results = await Promise.allSettled(tasks)
            if (abortControllerRef.current?.signal.aborted) {
                setIsRunning(false)
                return
            }

            const rejected = results.filter((r) => r.status === 'rejected')
            if (rejected.length) {
                console.warn('Some listener tasks rejected:', rejected)
            }

            console.log("=== STREAM COMPLETE ===");
            console.log("Name Chunks:", nameChunksRef.current);
            console.log("Name Combined:", nameChunksRef.current.join(""));
            console.log("");
            console.log("Description Chunks:", descriptionChunksRef.current);
            console.log("Description Combined:", descriptionChunksRef.current.join(""));
            console.log("");
            console.log("Raw Stream Chunks:", rawStreamChunksRef.current);
            console.log("Raw Stream Combined:", rawStreamChunksRef.current.join(""));
            console.log("");
            console.log("Color Chunks:", colorChunksRef.current);
            console.log("Color Combined:", colorChunksRef.current.join(""));
            console.log("");
            console.log("Weight Chunks:", weightChunksRef.current);
            console.log("Weight Combined:", weightChunksRef.current.join(""));
            console.log("");
            console.log("Tags:", tagsRef.current);
            console.log("======================");

            setIsRunning(false)
        })())
    }

    useEffect(() => {
        startStream();
        return () => {
            abortControllerRef.current?.abort();
        }
    }, []) // Run once on mount

    const resetStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRunning(false);
        setCurrentJson("");

        setNameStreamValue("");
        setDescriptionStreamValue("");
        setDescriptionPromiseValue("");
        setTags([]);
        setColorStreamValue("");
        setWeightPromiseValue("");
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (e.shiftKey) {
                    resetStream();
                } else {
                    startStream();
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [chunkSize, intervalMs, isRunning])

    return (
        <div className="main-demo-container">
            <header>
                <h1>JSON Stream Parser Demo</h1>
            </header>

            <div className="content-wrapper">
                <div className="left-panel">
                    <h2>JsonStreamParser API Demo</h2>

                    <div className="card control-card">
                        <h3>LIVE JSON Stream:</h3>

                        <div className="control-group">
                            <label>Chunk Size: {chunkSize}</label>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={chunkSize}
                                onChange={(e) => setChunkSize(Number(e.target.value))}
                            />
                        </div>

                        <div className="control-group">
                            <label>Interval (ms): {intervalMs}</label>
                            <input
                                type="range"
                                min="10"
                                max="500"
                                value={intervalMs}
                                onChange={(e) => setIntervalMs(Number(e.target.value))}
                            />
                        </div>

                        <div className="code-preview">
                            <CodeBlock
                                text={currentJson}
                                language="json"
                                showLineNumbers={false}
                                theme={dracula}
                                wrapLongLines={true}
                                customStyle={{ height: '300px', overflow: 'auto', fontSize: '0.8rem' }}
                            />
                        </div>

                        <div className="code-snippet">
                            <code>final parser = JsonStreamParser(stream);</code>
                        </div>

                        <div className="button-group">
                            <button className="primary-btn" onClick={startStream}>Run Streams (Spacebar)</button>
                            <button className="secondary-btn" onClick={resetStream}>Reset (Shift+Space)</button>
                        </div>
                    </div>
                </div>

                <div className="right-panel">
                    <div className="demo-section">
                        <div className="code-header">
                            <code>parser.getStringProperty("name").listen(...);</code>
                            <p>Provides the "name" property from the JSON data as a stream, receiving the chunks as it arrives from the main stream.</p>
                        </div>
                        <div className="result-box">
                            <span className="arrow">&gt;</span> {nameStreamValue}
                        </div>
                    </div>

                    <div className="demo-section">
                        <div className="code-header">
                            <code>parser.stream.getString("description").listen(...);</code>
                            <p>Provides the "description" property from the JSON data as a stream, receiving the chunks as it arrives from the main stream.</p>
                        </div>
                        <div className="result-box">
                            <span className="arrow">&gt;</span> {descriptionStreamValue}
                        </div>
                    </div>

                    <div className="demo-section">
                        <div className="code-header">
                            <code>await parser.future.getString("description");</code>
                            <p>Provides the "description" property from the JSON data as a future, resolving once the entire property value has been received.</p>
                        </div>
                        <div className="result-box">
                            <span className="arrow">&gt;</span> {descriptionPromiseValue}
                        </div>
                    </div>

                    <div className="demo-grid">
                        <div className="demo-section">
                            <div className="code-header">
                                <code>parser.stream.getList("tags", onElement: ...);</code>
                                <p>[3] Listens to the "tags" array and builds a list as items stream in. `onElement` runs immediately on the first token of a value found before it's even complete and parseable.</p>
                            </div>
                            <div className="list-results">
                                {tags.map((tag, i) => (
                                    <div key={i} className="result-box list-item">
                                        <span className="arrow">&gt;</span> {tag}
                                    </div>
                                ))}
                                {tags.length === 0 && <div className="result-box list-item placeholder">Waiting for tags...</div>}
                            </div>
                        </div>

                        <div className="demo-column">
                            <div className="demo-section">
                                <div className="code-header">
                                    <code>parser.stream.getString("details.color");</code>
                                    <p>Provides the "color" property nested within the "details" object as a stream.</p>
                                </div>
                                <div className="result-box small-box">
                                    <span className="arrow">&gt;</span> {colorStreamValue}
                                </div>
                            </div>

                            <div className="demo-section">
                                <div className="code-header">
                                    <code>await parser.future.getString("details.weight");</code>
                                    <p>Provides the "weight" property nested within the "details" object as a future.</p>
                                </div>
                                <div className="result-box small-box">
                                    <span className="arrow">&gt;</span> {weightPromiseValue}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MainDemo
