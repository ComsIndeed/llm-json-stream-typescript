import React from 'react'

function escapeHtml(str: string) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function syntaxHighlight(code: string) {
    if (!code) return { __html: '' };

    let result = '';
    let lastIndex = 0;
    // Capture: (1) comments, (2) strings, (3) numbers, (4) keywords, or (5) punctuation
    const regex = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+\.?\d*\b)|\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|async|await|import|from|new|class|extends|interface|type|true|false|null|boolean|number|string)\b|[{}\[\]()<>;:,\.]|\+|\-|\*|\/|=%?/gm;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(code)) !== null) {
        const idx = m.index;
        if (lastIndex < idx) {
            result += escapeHtml(code.slice(lastIndex, idx));
        }

        if (m[1]) {
            // comment
            result += `<span class="cs-comment">${escapeHtml(m[1])}</span>`;
        } else if (m[2]) {
            // string
            result += `<span class="cs-string">${escapeHtml(m[2])}</span>`;
        } else if (m[3]) {
            // number
            result += `<span class="cs-number">${escapeHtml(m[3])}</span>`;
        } else if (m[4]) {
            // keyword
            result += `<span class="cs-keyword">${escapeHtml(m[4])}</span>`;
        } else {
            // punctuation / operators
            result += `<span class="cs-punct">${escapeHtml(m[0])}</span>`;
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < code.length) result += escapeHtml(code.slice(lastIndex));
    return { __html: result };
}

export default function CodeSnippet(props: { code: string, style?: React.CSSProperties }) {
    const { code, style } = props;
    return (
        <div className="code-container" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace' }}>
            <style>{`
                .code-container .code-layer { box-sizing: border-box; margin: 0; padding: 8px; width: 100%; color: #ffffff; }
                .cs-comment { color: rgba(255,255,255,0.35); }
                .cs-keyword { color: #00d1ff; font-weight: 600; }
                .cs-string { color: #0b8235; }
                .cs-number { color: #ffffff; }
                .cs-punct { color: #60a5fa; }
            `}</style>

            <pre
                className="code-layer"
                style={{ whiteSpace: 'pre-wrap', overflow: 'hidden', margin: 0, ...style }}
                dangerouslySetInnerHTML={syntaxHighlight(code)}
            />
        </div>
    );
}
