function JsonStreamCodeView(props: { jsonStreamValue: string, jsonStreamFullValue?: string, width?: string, wrap?: boolean, textStyle?: React.CSSProperties }) {
    const configs = {
        width: props.width || '100%',
        wrap: props.wrap !== undefined ? props.wrap : true,
    };

    const escapeHtml = (str: string) =>
        str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function syntaxHighlight(text: string) {
        if (!text) return { __html: '' };

        let result = '';
        let lastIndex = 0;
        // This regex finds: a key ("..."\s*:), a string, a number, a literal (true|false|null), or punctuation
        const regex = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|[{}\[\],:]/g;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(text)) !== null) {
            const idx = m.index;
            if (lastIndex < idx) {
                result += escapeHtml(text.slice(lastIndex, idx));
            }

            if (m[1]) {
                // key with trailing colon (may include whitespace before colon)
                const keyWithColon = m[1];
                const colonPos = keyWithColon.lastIndexOf(':');
                const keyText = keyWithColon.slice(0, colonPos);
                const colonAndSpaces = keyWithColon.slice(colonPos);
                result += `<span class="json-key">${escapeHtml(keyText)}</span>${escapeHtml(colonAndSpaces)}`;
            } else if (m[2]) {
                result += `<span class="json-string">${escapeHtml(m[2])}</span>`;
            } else if (m[3]) {
                result += `<span class="json-number">${escapeHtml(m[3])}</span>`;
            } else if (m[4]) {
                result += `<span class="json-literal">${escapeHtml(m[4])}</span>`;
            } else {
                // punctuation
                result += `<span class="json-punct">${escapeHtml(m[0])}</span>`;
            }

            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) result += escapeHtml(text.slice(lastIndex));
        return { __html: result };
    }

    const whiteSpace = configs.wrap ? 'pre-wrap' : 'pre';
    const overflow = configs.wrap ? 'hidden' : 'auto';

    return <div className="json-code-container" style={{ width: configs.width, position: 'relative', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace', fontSize: 13 }}>
        <style>{`
            .json-code-container .json-code-inner { position: relative; }
            .json-code-layer { box-sizing: border-box; margin: 0; padding: 12px; width: 100%; color: #ffffff; }
            .json-ghost { color: rgba(255,255,255,0.35); }
            .json-foreground { position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 2; pointer-events: none; }
            /* Keys should be cyan */
            .json-key { color: #00d1ff; }
            /* Strings, numbers, literals — keep them white (same as base) */
            .json-string { color: #ffffff; }
            .json-number { color: #ffffff; }
            .json-literal { color: #ffffff; }
            /* Braces/punctuation in blue */
            .json-punct { color: #60a5fa; }
        `}</style>

        <div className="json-code-inner">
            {/* Ghost full value (in the flow so it defines height) */}
            {props.jsonStreamFullValue ? (
                <pre
                    className="json-code-layer json-ghost"
                    style={{ whiteSpace, overflow, opacity: 0.25, margin: 0, ...props.textStyle }}
                    dangerouslySetInnerHTML={syntaxHighlight(props.jsonStreamFullValue)}
                />
            ) : (
                // keep a small placeholder so height isn't zero when there's no full value
                <pre className="json-code-layer json-ghost" style={{ whiteSpace, overflow, opacity: 0.0, margin: 0, ...props.textStyle }}>
                    {''}
                </pre>
            )}

            {/* Foreground (building value) - overlays the ghost */}
            <pre
                className="json-code-layer json-foreground"
                style={{ whiteSpace, overflow, background: 'transparent', margin: 0, ...props.textStyle }}
                dangerouslySetInnerHTML={syntaxHighlight(props.jsonStreamValue)}
            />
        </div>
    </div>;
}

export default JsonStreamCodeView;
