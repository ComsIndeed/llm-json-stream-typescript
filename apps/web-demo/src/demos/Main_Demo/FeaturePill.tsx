import { useState, useEffect } from "react";
import { listenTo } from "../../utils/listenTo";

export function FeaturePill(props: { stream: AsyncIterable<any>; enterDelayMs: number; abortSignal?: AbortSignal; }) {
    const [text, setText] = useState<string>("");

    useEffect(() => {
        let cancelled = false;
        setText("");

        void listenTo(props.stream as AsyncIterable<string>, (value) => {
            if (cancelled) return;
            setText((prev) => prev + value);
        }, { signal: props.abortSignal });

        return () => {
            cancelled = true;
        };
    }, [props.stream, props.abortSignal]);

    return (
        <span
            style={{
                backgroundColor: "#5b3eb7",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 13,
                boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)",
                display: "inline-flex",
                alignItems: "center",
                whiteSpace: "pre-wrap",

                // Smoothly grow as streamed text lengthens/wraps.
                transition: "transform 220ms ease, opacity 220ms ease",

                // Animate-in when the element first appears.
                animation: `pillIn 240ms cubic-bezier(.2,.8,.2,1) ${props.enterDelayMs}ms both`,
                transformOrigin: "left center",
            }}
        >
            {text}
        </span>
    );
}
