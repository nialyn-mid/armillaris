// Helper component for highlighting
export const HighlightedTextarea = ({ value, onChange, matches }: { value: string, onChange: (e: any) => void, matches: any[] }) => {
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

    const renderHighlights = () => {
        const elements = [];
        let cursor = 0;

        flatMatches.forEach((m, i) => {
            // Text before match
            if (m.index > cursor) {
                elements.push(<span key={`text-${i}`}>{value.substring(cursor, m.index)}</span>);
            }
            // Match
            const color = m.type === 'specific' ? '#d2a8ff' : '#79c0ff'; // Purple for specific, Blue for meta
            elements.push(
                <span key={`match-${i}`} style={{ color, fontWeight: 'bold' }}>
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
        <div style={{ position: 'relative', width: '100%', height: '100%', fontFamily: 'monospace', fontSize: '14px', lineHeight: '20px' }}>
            {/* Backdrop for highlights */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                padding: '10px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                color: '#fff',
                // Approach: Render colored text in backdrop. Foreground textarea is transparent color.
                pointerEvents: 'none',
                backgroundColor: '#0d1117'
            }}>
                {renderHighlights()}
            </div>

            {/* Foreground Textarea */}
            <textarea
                value={value}
                onChange={onChange}
                placeholder="Type to filter/activate nodes..."
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
                    background: 'transparent',
                    color: 'transparent', // Transparent text
                    caretColor: '#fff', // White cursor
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                }}
            />
        </div>
    );
};
