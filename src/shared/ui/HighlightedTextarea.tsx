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
        if (matches.length === 0) return [value];

        let allMatches = matches.map((m, mIdx) => {
            const color = m.color || (m.type === 'specific' ? '#d2a8ff' : '#58a6ff');
            return { start: m.index, end: m.index + m.length, color, mIdx, id: `${mIdx}-${m.index}-${m.length}`, length: m.length };
        });

        // Sort by end position (Earliest End Time) to pack tracks optimally
        allMatches.sort((a, b) => a.end - b.end);

        let trackLastEnd = [-1, -1, -1];
        let rangeToTrack = new Map<string, number>();
        allMatches.forEach(r => {
            for (let i = 0; i < 3; i++) {
                if (trackLastEnd[i] <= r.start) {
                    trackLastEnd[i] = r.end;
                    rangeToTrack.set(r.id, i);
                    break;
                }
            }
        });

        // Points for segment boundary changes
        let points: { pos: number, type: 'start' | 'end', r: any }[] = [];
        allMatches.forEach(r => {
            if (rangeToTrack.has(r.id)) {
                points.push({ pos: r.start, type: 'start', r });
                points.push({ pos: r.end, type: 'end', r });
            }
        });
        points.sort((a, b) => a.pos - b.pos || (a.type === 'end' ? -1 : 1));

        const elements = [];
        let cursor = 0;
        let activeMatches = new Set<any>();

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pos > cursor) {
                const chunk = value.substring(cursor, p.pos);
                if (activeMatches.size === 0) {
                    elements.push(<span key={cursor}>{chunk}</span>);
                } else {
                    const activeList = Array.from(activeMatches).map(r => ({ ...r, track: rangeToTrack.get(r.id)! }));
                    activeList.sort((a, b) => a.track - b.track);

                    const winner = activeList[0];
                    const shadows: string[] = [];
                    const maxTrack = Math.max(...activeList.map(a => a.track));

                    for (let t = 0; t <= maxTrack; t++) {
                        const rangeInTrack = activeList.find(a => a.track === t);
                        const color = rangeInTrack ? rangeInTrack.color : 'transparent';
                        shadows.push(`0 ${(t + 1) * 3}px 0 ${color}`);
                    }

                    const style: React.CSSProperties = {
                        backgroundColor: `${winner.color}33`,
                        color: '#fff',
                        fontWeight: 'bold',
                        borderRadius: '1px',
                        boxShadow: shadows.join(', '),
                        paddingBottom: '1px'
                    };

                    elements.push(<span key={cursor} style={style}>{chunk}</span>);
                }
            }
            if (p.type === 'start') activeMatches.add(p.r);
            else activeMatches.delete(p.r);
            cursor = p.pos;
        }

        if (cursor < value.length) {
            elements.push(<span key="text-end">{value.substring(cursor)}</span>);
        }

        if (value.endsWith('\n')) elements.push(<br key="br-end" />);

        return elements;
    };

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '24px',
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
                minHeight: '140px', // Extra for underlines
                lineHeight: '24px', // Extra breathing room
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
                    lineHeight: '24px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    overflow: 'hidden', // Grow with parent, no scrollbar
                    boxSizing: 'border-box'
                }}
            />
        </div>
    );
};
