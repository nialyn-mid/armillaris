import { useRef, useState, useEffect, useMemo } from 'react';
import { MdQuestionAnswer, MdUnfoldLess, MdUnfoldMore, MdAdd, MdLastPage, MdChevronLeft } from 'react-icons/md';
import { GoDotFill } from 'react-icons/go';
import { HighlightedTextarea } from '../../../shared/ui/HighlightedTextarea';
import { useChatSession } from '../hooks/useChatSession';

interface ChatOverlayProps {
    session: ReturnType<typeof useChatSession>;
    matches: any[];
    onInputChange: (val: string) => void;
    highlights: any;
    id?: string;
}

function RenderHighlightedText({ text, highlights }: { text: string, highlights?: any[] }) {
    if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
        return <span>{text}</span>;
    }

    // Solve for tracks (up to 3 layers)
    let allRanges: { start: number, end: number, color: string, hIdx: number, id: string, length: number }[] = [];
    highlights.forEach((h, hIdx) => {
        if (!h.ranges || !Array.isArray(h.ranges)) return;
        h.ranges.forEach(([s, e]: [number, number]) => {
            allRanges.push({ start: s, end: e, color: h.color, hIdx, id: `${hIdx}-${s}-${e}`, length: e - s });
        });
    });

    // Sort by end position (Earliest End Time) to pack tracks optimally
    allRanges.sort((a, b) => a.end - b.end);

    let trackLastEnd = [-1, -1, -1];
    let rangeToTrack = new Map<string, number>();
    allRanges.forEach(r => {
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
    allRanges.forEach(r => {
        if (rangeToTrack.has(r.id)) {
            points.push({ pos: r.start, type: 'start', r });
            points.push({ pos: r.end, type: 'end', r });
        }
    });

    // Sort: earliest points first. If same pos, end before start
    points.sort((a, b) => a.pos - b.pos || (a.type === 'end' ? -1 : 1));

    let result: React.ReactNode[] = [];
    let lastPos = 0;
    let activeRanges = new Set<any>();

    for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Render segment before this point
        if (p.pos > lastPos) {
            const chunk = text.substring(lastPos, p.pos);
            if (activeRanges.size === 0) {
                result.push(<span key={lastPos}>{chunk}</span>);
            } else {
                const activeList = Array.from(activeRanges).map(r => ({ ...r, track: rangeToTrack.get(r.id)! }));
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
                    borderRadius: '1px',
                    boxShadow: shadows.join(', '),
                    paddingBottom: '1px'
                };

                result.push(<span key={lastPos} style={style}>{chunk}</span>);
            }
        }

        if (p.type === 'start') activeRanges.add(p.r);
        else activeRanges.delete(p.r);
        lastPos = p.pos;
    }

    // Render remaining text
    if (lastPos < text.length) {
        result.push(<span key={lastPos}>{text.substring(lastPos)}</span>);
    }

    return <span>{result}</span>;
}

export function ChatOverlay({ session, matches, onInputChange, highlights, id }: ChatOverlayProps) {
    const {
        chatInput, setChatInput,
        chatHistory,
        isChatHistoryOpen, setIsChatHistoryOpen,
        isChatCollapsed, setIsChatCollapsed,
        editingMsgId,
        editContent, setEditContent,
        submitUserMessage,
        startEditing,
        saveEdit,
        deleteMessage,
        insertBotMessage
    } = session;

    const historyRef = useRef<HTMLDivElement>(null);

    const [isRightAligned, setIsRightAligned] = useState(() => {
        return localStorage.getItem('chat_sandbox_aligned_right') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('chat_sandbox_aligned_right', String(isRightAligned));
    }, [isRightAligned]);

    // Auto-scroll to bottom of history
    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [chatHistory, isChatHistoryOpen]);

    const handleChange = (e: any) => {
        const val = e.target.value;
        setChatInput(val);
        onInputChange(val);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitUserMessage();
            onInputChange(""); // Clear matches/highlights?
        }
    };

    const inputHighlights = (Array.isArray(highlights) && highlights.length > 0) ? highlights[0] : null;
    const transformedInputMatches = useMemo(() => {
        if (!inputHighlights) return matches;
        const hMatches: any[] = [];
        inputHighlights.forEach((h: any) => {
            if (!h.ranges) return;
            h.ranges.forEach(([start, end]: [number, number]) => {
                hMatches.push({ index: start, length: end - start, color: h.color });
            });
        });
        return [...matches, ...hMatches];
    }, [matches, inputHighlights]);

    return (
        <div id={id} className="floating-island" style={{
            bottom: isChatCollapsed ? '0px' : '30px',
            left: isRightAligned ? 'auto' : '50%',
            right: isRightAligned ? '20px' : 'auto',
            transform: isRightAligned ? 'none' : 'translateX(-50%)',
            width: '70%',
            maxWidth: '800px',
            minWidth: '400px',
            height: 'auto',
            maxHeight: isChatCollapsed ? 'auto' : '80%',
            marginBottom: isChatCollapsed ? '0' : '0',
            transition: 'all 0.3s ease',
            borderBottomLeftRadius: isChatCollapsed ? 0 : 8,
            borderBottomRightRadius: isChatCollapsed ? 0 : 8,
            background: 'rgba(37, 37, 38, 0.95)',
            boxShadow: isChatCollapsed ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible'
        }}>
            {/* Chat Header */}
            <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                background: 'rgba(37, 37, 38, 0.4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isChatCollapsed ? 'none' : '1px solid rgba(48, 54, 61, 0.5)',
                borderTopLeftRadius: '7px',
                borderTopRightRadius: '7px',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="unselectable" style={{ fontWeight: 600 }}>Chat Sandbox</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <GoDotFill className={`chat-status-dot ${chatHistory.length > 0 ? 'active' : 'inactive'}`} />
                    <button
                        className="btn-icon"
                        onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
                        title="Toggle History"
                        style={{ color: isChatHistoryOpen ? '#58a6ff' : 'inherit' }}
                    >
                        <MdQuestionAnswer />
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => setIsRightAligned(!isRightAligned)}
                        title={isRightAligned ? "Center Sandbox" : "Align Sandbox Right"}
                    >
                        {isRightAligned ? <MdChevronLeft /> : <MdLastPage />}
                    </button>
                    <button
                        className="btn-icon"
                        onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                        title={isChatCollapsed ? "Expand" : "Collapse"}
                    >
                        {isChatCollapsed ? <MdUnfoldMore /> : <MdUnfoldLess />}
                    </button>
                </div>
            </div>

            {/* Chat History Panel */}
            {isChatHistoryOpen && !isChatCollapsed && (
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px',
                    background: 'var(--bg-secondary)',
                    borderTop: 'none',
                    display: 'flex',
                    flexDirection: 'column'
                }} ref={historyRef}>
                    <div className="unselectable" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>History</div>
                    {chatHistory.length === 0 && <div className="unselectable" style={{ opacity: 0.5, fontSize: '0.8rem' }}>No history</div>}

                    {chatHistory.map((msg, idx) => {
                        const historyIdxFromEnd = chatHistory.length - 1 - idx;
                        const msgHighlights = (Array.isArray(highlights) && (historyIdxFromEnd + 1) < highlights.length)
                            ? highlights[historyIdxFromEnd + 1]
                            : undefined;

                        return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <div
                                    className="chat-message-row"
                                    onClick={() => !editingMsgId && startEditing(msg)}
                                >
                                    <button
                                        className="chat-msg-delete-btn"
                                        onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                                        title="Delete Message"
                                    >&times;</button>
                                    <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#58a6ff' : '#7ee787' }}>
                                        {msg.role === 'user' ? 'YOU' : 'BOT'}:
                                    </span>
                                    {editingMsgId === msg.id ? (
                                        <input
                                            autoFocus
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            onBlur={() => saveEdit(msg.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                                            placeholder="Type bot message..."
                                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent-color)', color: 'var(--text-primary)', marginLeft: '5px', width: '95%' }}
                                        />
                                    ) : (
                                        <span style={{ marginLeft: '5px' }}>
                                            <RenderHighlightedText text={msg.content} highlights={msgHighlights} />
                                        </span>
                                    )}
                                </div>

                                <div className="chat-separator">
                                    <button className="chat-add-bot-btn" onClick={() => insertBotMessage(idx)} title="Add Bot Message here">
                                        <MdAdd /> Add Bot Message
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Input Area */}
            {!isChatCollapsed && (
                <div style={{ minHeight: '120px', position: 'relative', display: 'flex', padding: '0', flexShrink: 0 }}>
                    <div style={{ flex: 1, position: 'relative', borderBottomLeftRadius: '7px', borderBottomRightRadius: '7px' }}>
                        <HighlightedTextarea
                            value={chatInput}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            matches={transformedInputMatches}
                        />
                        {chatInput && (
                            <button
                                className="chat-input-clear-btn unselectable"
                                onClick={() => { setChatInput(""); onInputChange(""); }}
                                title="Clear Input"
                            >&times;</button>
                        )}
                        <button
                            onClick={() => {
                                submitUserMessage();
                                onInputChange("");
                            }}
                            className="btn-primary"
                            style={{
                                position: 'absolute',
                                right: '10px',
                                bottom: '10px',
                                width: 'auto',
                                height: '28px',
                                padding: '0 12px',
                                fontSize: '0.8rem',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                            title="Send (Enter)"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
