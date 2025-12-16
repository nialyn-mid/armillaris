// Helper component for highlighting
export const HighlightedTextarea = ({
    value,
    onChange,
    onKeyDown,
    matches = [],
    mode = 'default'
}: {
    value: string,
    onChange: (e: any) => void,
    onKeyDown?: (e: any) => void,
    matches?: any[],
    mode?: 'default' | 'description'
}) => {

    const renderHighlights = () => {
        if (mode === 'description') {
            // Description Mode: Highlight ALL CAPS and Newlines
            const tokens = [];
            const regex = /(\n|\b[A-Z]{2,}\b)/g;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(value)) !== null) {
                // Text before match
                if (match.index > lastIndex) {
                    tokens.push(value.substring(lastIndex, match.index));
                }

                const matchedStr = match[0];
                if (matchedStr === '\n') {
                    // Newline Marker - Absolute positioned to not affect flow
                    tokens.push(
                        <span key={match.index} style={{ position: 'relative', display: 'inline-block', width: '0px', height: '0px', overflow: 'visible' }}>
                            <span className="newline-marker" style={{
                                position: 'absolute',
                                left: '2px', // Slight offset
                                top: '-1.1em',
                                color: '#32619b',
                                fontSize: '0.8em',
                                userSelect: 'none',
                                pointerEvents: 'none'
                            }}>
                                \n
                            </span>
                        </span>
                    );
                    tokens.push('\n'); // Actual newline for layout
                } else {
                    // ALL CAPS - Subtle text color change
                    tokens.push(
                        <span key={match.index} style={{
                            color: '#d2a8ff', // Soft purple text
                            fontWeight: '600'
                        }}>
                            {matchedStr}
                        </span>
                    );
                }
                lastIndex = regex.lastIndex;
            }

            // Remaining text
            if (lastIndex < value.length) {
                tokens.push(value.substring(lastIndex));
            }

            // Add a break if ends with newline to match textarea height behavior
            if (value.endsWith('\n')) tokens.push(<br key="br-end" />);

            return tokens;
        }

        // Default Mode (Search Matches in Chat)
        // Sort matches by index
        const sorted = [...matches].sort((a, b) => a.index - b.index);

        // Flatten matches to avoid overlap (simple greedy: skip if overlaps previous)
        const flatMatches: any[] = [];
        let lastEnd = 0;
        for (const m of sorted) {
            if (m.index >= lastEnd) {
                flatMatches.push(m);
                lastEnd = m.index + m.length;
            }
        }

        const elements = [];
        let cursor = 0;

        flatMatches.forEach((m, i) => {
            // Text before match
            if (m.index > cursor) {
                elements.push(<span key={`text-${i}`}>{value.substring(cursor, m.index)}</span>);
            }
            // Match
            // Specific color logic moved directly to style or simplified
            elements.push(
                <span key={`match-${i}`} style={{
                    backgroundColor: m.type === 'specific' ? 'rgba(210, 168, 255, 0.2)' : 'rgba(56, 139, 253, 0.2)',
                    borderBottom: m.type === 'specific' ? '1px solid #d2a8ff' : '1px solid #58a6ff',
                    color: '#fff',
                    fontWeight: 'bold'
                }}>
                    {value.substring(m.index, m.index + m.length)}
                </span>
            );
            cursor = m.index + m.length;
        });

        // Remaining text
        if (cursor < value.length) {
            elements.push(<span key="text-end">{value.substring(cursor)}</span>);
        }

        // Add a space/break to ensure height matches if ends with newline
        if (value.endsWith('\n')) elements.push(<br key="br-end" />);

        return elements;
    };

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '20px',
            borderRadius: 'inherit'
        }}>
            {/* Backdrop for highlights - Dictates Height */}
            <div style={{
                position: 'relative',
                padding: '10px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                color: '#fff',
                backgroundColor: '#0d1117',
                minHeight: '120px', // Match min-height expectation
                pointerEvents: 'none',
                borderRadius: 'inherit',
                boxSizing: 'border-box'
            }}>
                {renderHighlights()}
                {/* Extra character to ensure height matches if textarea has trailing newline */}
                <span style={{ opacity: 0 }}>.</span>
            </div>

            {/* Foreground Textarea */}
            <textarea
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder="Type..."
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    padding: '10px',
                    border: 'none',
                    borderRadius: 'inherit',
                    background: 'transparent',
                    color: 'transparent', // Transparent text
                    caretColor: '#fff', // White cursor
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflow: 'hidden', // Grow with parent, no scrollbar
                    boxSizing: 'border-box'
                }}
            />
        </div>
    );
};
