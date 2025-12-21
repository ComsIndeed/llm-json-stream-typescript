import { useEffect, useState } from "react";
import { JsonStream } from "../../../../../packages/llm-json-stream/dist";
import { listenTo } from "../../utils/listenTo";
import { cardStyle } from "./MainDemo";
import { FeaturePill } from "./FeaturePill";

type FeatureItem = {
    index: number;
    stream: AsyncIterable<any>;
};

interface Article {
    title: string;
    author: string;
    description: string;
    image: {
        url: string;
        generated_with: string;
    };
    features: string[];
}

export function StreamingCard(props: { parserStream: AsyncIterable<string> | null, abortController: AbortController | null }) {
    const [title, setTitle] = useState<string>("");
    const [author, setAuthor] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string>("");
    const [imageGeneratedWith, setImageGeneratedWith] = useState<string>("");
    const [featureItems, setFeatureItems] = useState<FeatureItem[]>([]);

    useEffect(() => {
        if (!props.parserStream) {
            // Reset all values when stream is cleared
            setTitle("");
            setAuthor("");
            setDescription("");
            setImageUrl("");
            setImageGeneratedWith("");
            setFeatureItems([]);
            return;
        }

        // 1. INSTANTIATE INSIDE USEEFFECT - using new JsonStream.parse() API
        const jsonStream = JsonStream.parse<Article>(props.parserStream);
        const article = jsonStream.paths();

        // Reset values on new stream.
        setTitle("");
        setAuthor("");
        setDescription("");
        setImageUrl("");
        setImageGeneratedWith("");
        setFeatureItems([]);

        // 2. REGISTER LISTENERS IMMEDIATELY (Synchronously after creation)
        void listenTo(article.title, (value) => {
            setTitle((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        void listenTo(article.author, (value) => {
            setAuthor((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        void listenTo(article.description, (value) => {
            setDescription((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        void listenTo(article.image.url, (value) => {
            setImageUrl((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        void listenTo(article.image.generated_with, (value) => {
            setImageGeneratedWith((prev) => prev + value);
        }, { signal: props.abortController?.signal });

        // Handle array of features - iterate over each element
        (async () => {
            let index = 0;
            for await (const featureAsync of article.features) {
                const currentIndex = index++;
                setFeatureItems((prev) => {
                    if (prev.some((p) => p.index === currentIndex)) return prev;
                    return [...prev, { index: currentIndex, stream: featureAsync }].sort(
                        (a, b) => a.index - b.index,
                    );
                });
            }
        })();

        // 3. CLEANUP
        return () => {
            jsonStream.dispose();
        };
    }, [props.parserStream, props.abortController]);

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
                        paddingBottom: 40
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