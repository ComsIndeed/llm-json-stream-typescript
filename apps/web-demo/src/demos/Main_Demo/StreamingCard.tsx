import { useEffect, useMemo, useState } from "react";
import { JsonStreamParser } from "../../../../../packages/llm-json-stream/dist";
import { listenTo } from "../../utils/listenTo";
import { cardStyle } from "./MainDemo";
import { FeaturePill } from "./FeaturePill";

type FeatureItem = {
    index: number;
    stream: AsyncIterable<any>;
};

export function StreamingCard(props: { parserStream: AsyncIterable<string> | null, abortController: AbortController | null }) {
    const [title, setTitle] = useState<string>("");
    const [author, setAuthor] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string>("");
    const [imageGeneratedWith, setImageGeneratedWith] = useState<string>("");
    const [featureItems, setFeatureItems] = useState<FeatureItem[]>([]);

    // Create a fresh parser when the stream changes.
    const parser = useMemo(() => {
        if (!props.parserStream) return null;
        return new JsonStreamParser(props.parserStream);
    }, [props.parserStream]);

    useEffect(() => {
        if (!parser) {
            // Reset all values when stream is cleared
            setTitle("");
            setAuthor("");
            setDescription("");
            setImageUrl("");
            setImageGeneratedWith("");
            setFeatureItems([]);
            return;
        }

        // Reset values on new stream.
        setTitle("");
        setAuthor("");
        setDescription("");
        setImageUrl("");
        setImageGeneratedWith("");
        setFeatureItems([]);

        // Fire-and-forget: we intentionally don't await these.
        // (They stop naturally when the upstream iterable ends.)
        void listenTo(parser.getStringProperty("title"), (value) => {
            setTitle((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        void listenTo(parser.getStringProperty("author"), (value) => {
            setAuthor((prev) => prev + value);
        }, { signal: props.abortController?.signal });
        void listenTo(parser.getStringProperty("description"), (value) => {
            setDescription((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        void listenTo(parser.getStringProperty("image.url"), (value) => {
            setImageUrl((prev) => prev + value);
        }, { signal: props.abortController?.signal });
        void listenTo(parser.getStringProperty("image.generated_with"), (value) => {
            setImageGeneratedWith((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        parser.getArrayProperty("features").onElement((elementStream, index) => {
            setFeatureItems((prev) => {
                if (prev.some((p) => p.index === index)) return prev;
                return [...prev, { index, stream: elementStream }].sort(
                    (a, b) => a.index - b.index,
                );
            });
        });
    }, [parser, props.abortController]);

    const displayTitle = title || " ";

    return (
        <div
            style={{
                ...cardStyle,
                color: "#ffffff",
                padding: 16,
                backgroundColor: "#2b2b2b",
                borderRadius: 12,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",

                // Smooth implicit resizing as content grows / wraps.
                transition: "all 260ms ease",
            }}
        >
            <style>
                {`
                @keyframes pillIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                `}
            </style>
            <h2 style={{ margin: 0, marginBottom: 12, textAlign: "center", flex: "0 0 auto" }}>
                {displayTitle}
            </h2>

            {imageUrl ? (
                <div
                    style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        flex: "0 0 200px",
                    }}
                >
                    <img
                        src={imageUrl}
                        alt={displayTitle}
                        style={{
                            width: "100%",
                            height: 200,
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            left: "50%",
                            transform: "translateX(-50%)",
                            bottom: 8,
                            backgroundColor: "rgba(0,0,0,0.6)",
                            color: "#ffffff",
                            padding: "6px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                        }}
                    >
                        Created by: {imageGeneratedWith || author || " "}
                    </div>
                </div>
            ) : null}

            <div
                style={{
                    marginTop: 12,
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflow: "auto",
                    transition: "all 260ms ease",
                }}
            >
                {author ? (
                    <div
                        style={{
                            fontSize: 12,
                            opacity: 0.9,
                            marginBottom: 8,
                        }}
                    >
                        <strong>Author:</strong> {author}
                    </div>
                ) : null}

                <p
                    style={{
                        marginTop: 0,
                        marginBottom: 8,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.4,
                        opacity: description ? 1 : 0.7,
                    }}
                >
                    {description || " "}
                </p>

                {featureItems.length > 0 && (
                    <div
                        style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            transition: "all 260ms ease",
                        }}
                    >
                        {featureItems.map((item, i) => (
                            <FeaturePill
                                key={item.index}
                                stream={item.stream}
                                enterDelayMs={Math.min(i * 25, 250)}
                                abortSignal={props.abortController?.signal}
                            />
                        ))}
                    </div>
                )}

                {imageGeneratedWith ? (
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>
                        Generated with: {imageGeneratedWith}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
