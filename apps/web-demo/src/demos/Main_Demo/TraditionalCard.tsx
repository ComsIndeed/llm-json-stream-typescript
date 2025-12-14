import { useEffect, useState } from "react";
import { cardStyle } from "./MainDemo";
import { listenTo } from "../../utils/listenTo";

type Parsed = { [key: string]: any } | null;

export function TraditionalCard(props: { jsonStreamPreview: AsyncIterable<string> | null }) {
    const [jsonStreamValue, setJsonStreamValue] = useState<string>("");
    const [parsedObj, setParsedObj] = useState<Parsed>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!props.jsonStreamPreview) {
            setJsonStreamValue("");
            return;
        }

        setJsonStreamValue("");

        void listenTo(props.jsonStreamPreview, (value) => {
            setJsonStreamValue((prev) => prev + value);
        });
    }, [props.jsonStreamPreview]);

    useEffect(() => {
        const s = jsonStreamValue ?? '';
        if (s.trim().length === 0) {
            setParsedObj(null);
            setError(null);
            return;
        }

        try {
            const obj = JSON.parse(s);
            setParsedObj(obj);
            setError(null);
        } catch (e: any) {
            // Heuristic: only show a parse error once there's evidence the stream closed
            // (a closing brace/bracket). While streaming partial JSON this avoids flashing errors.
            if (s.includes('}') || s.includes(']')) {
                setParsedObj(null);
                setError(e?.message ?? String(e));
            } else {
                setParsedObj(null);
                setError(null);
            }
        }
    }, [jsonStreamValue]);

    // Error state styling: full red background, yellow text for the error message
    if (error) {
        return (
            <div style={{ ...cardStyle, backgroundColor: '#ff0000', color: '#ffeb3b', padding: 16, width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ marginTop: 0 }}>Error parsing JSON</h2>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, color: '#ffeb3b', overflow: 'auto', flex: '1 1 auto', minHeight: 0 }}>{error}</pre>
            </div>
        );
    }

    // Placeholder while streaming
    if (!parsedObj) {
        return (
            <div style={{ ...cardStyle, color: '#ffffff', width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ marginTop: 0 }}>Traditional JSON Parse</h2>
                <p style={{ margin: 0, opacity: 0.8 }}>Waiting for full JSON to be available…</p>
            </div>
        );
    }

    const title = parsedObj.title ?? parsedObj?.name ?? '';
    const description = parsedObj.description ?? '';
    const author = parsedObj.author ?? '';
    const imageUrl = parsedObj.image?.url ?? '';
    const imageGeneratedWith = parsedObj.image?.generated_with ?? '';
    const features: string[] = Array.isArray(parsedObj.features) ? parsedObj.features : [];

    return (
        <div style={{ ...cardStyle, color: '#ffffff', padding: 16, backgroundColor: '#2b2b2b', borderRadius: 12, width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: 0, marginBottom: 12, textAlign: 'center', flex: '0 0 auto' }}>{title || 'Untitled'}</h2>

            {imageUrl ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', flex: '0 0 200px' }}>
                    <img src={imageUrl} alt={title ?? 'image'} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff', padding: '6px 10px', borderRadius: 8, fontSize: 12 }}>
                        Created by: {imageGeneratedWith || author || 'LLM'}
                    </div>
                </div>
            ) : null}

            <div style={{ marginTop: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
                {author ? <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 8 }}><strong>Author:</strong> {author}</div> : null}
                <p style={{ marginTop: 0, marginBottom: 8, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{description}</p>

                {features.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {features.map((f, i) => (
                            <span key={i} style={{ backgroundColor: '#5b3eb7', color: '#fff', padding: '6px 10px', borderRadius: 999, fontSize: 13, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.15)' }}>{f}</span>
                        ))}
                    </div>
                )}

                {imageGeneratedWith ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 12 }}>Generated with: {imageGeneratedWith}</div> : null}
            </div>
        </div>
    );
}
