import { useEffect, useMemo, useState } from "react";
import { JsonStreamParser } from "../../../../../packages/llm-json-stream/dist";
import { listenTo } from "../../utils/listenTo";
import { cardStyle } from "./MainDemo";

export function StreamingCard(props: { parserStream: AsyncIterable<string> | null }) {
    const [title, setTitle] = useState<string>("");
    const [author, setAuthor] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string>("");
    const [imageGeneratedWith, setImageGeneratedWith] = useState<string>("");
    const [features, setFeatures] = useState<string[]>([]);

    // Create a fresh parser when the stream changes.
    const parser = useMemo(() => {
        if (!props.parserStream) return null;
        return new JsonStreamParser(props.parserStream);
    }, [props.parserStream]);

    useEffect(() => {
        if (!parser) return;

        // Reset values on new stream.
        setTitle("");
        setAuthor("");
        setDescription("");
        setImageUrl("");
        setImageGeneratedWith("");
        setFeatures([]);

        // Fire-and-forget: we intentionally don't await these.
        // (They stop naturally when the upstream iterable ends.)
        void listenTo(parser.getStringProperty("title"), (value) => {
            setTitle((prev) => prev + value);
        });

        void listenTo(parser.getStringProperty("author"), (value) => {
            setAuthor((prev) => prev + value);
        });

        void listenTo(parser.getStringProperty("description"), (value) => {
            setDescription((prev) => prev + value);
        });

        void listenTo(parser.getStringProperty("image.url"), (value) => {
            setImageUrl((prev) => prev + value);
        });

        void listenTo(parser.getStringProperty("image.generated_with"), (value) => {
            setImageGeneratedWith((prev) => prev + value);
        });

        parser.getArrayProperty("features").onElement((elementStream) => {
            let elementIndex = -1;

            setFeatures((prev) => {
                elementIndex = prev.length;
                return [...prev, ""];
            });

            void listenTo(elementStream, (value) => {
                setFeatures((current) => {
                    if (elementIndex < 0 || elementIndex >= current.length) return current;

                    const next = current.slice();
                    next[elementIndex] = (next[elementIndex] ?? "") + value;
                    return next;
                });
            });
        });
    }, [parser]);

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
            }}
        >
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

            <div style={{ marginTop: 12, flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
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

                {features.length > 0 && (
                    <div
                        style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        {features.map((f, i) => (
                            <span
                                key={i}
                                style={{
                                    backgroundColor: "#5b3eb7",
                                    color: "#fff",
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    fontSize: 13,
                                    boxShadow:
                                        "inset 0 -2px 0 rgba(0,0,0,0.15)",
                                }}
                            >
                                {f}
                            </span>
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
