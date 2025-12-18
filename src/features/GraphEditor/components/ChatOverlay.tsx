import { useRef, useState, useEffect } from 'react';
import { MdQuestionAnswer, MdUnfoldLess, MdUnfoldMore, MdAdd, MdLastPage, MdChevronLeft } from 'react-icons/md';
import { GoDotFill } from 'react-icons/go';
import { HighlightedTextarea } from '../../../shared/ui/HighlightedTextarea';
import { useChatSession } from '../hooks/useChatSession';

interface ChatOverlayProps {
    session: ReturnType<typeof useChatSession>;
    matches: any[];
    onInputChange: (val: string) => void;
}

export function ChatOverlay({ session, matches, onInputChange }: ChatOverlayProps) {
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

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatInput(e.target.value);
        onInputChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitUserMessage();
            onInputChange(""); // Clear matches/highlights?
        }
    };

    return (
        <div className="floating-island" style={{
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
                    minHeight: '50px',
                    display: 'flex',
                    flexDirection: 'column'
                }} ref={historyRef}>
                    <div className="unselectable" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>History</div>
                    {chatHistory.length === 0 && <div className="unselectable" style={{ opacity: 0.5, fontSize: '0.8rem' }}>No history</div>}

                    {chatHistory.map((msg, idx) => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Message */}
                            <div
                                style={{ marginBottom: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
                                onClick={() => !editingMsgId && startEditing(msg)}
                            >
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
                                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent-color)', color: 'var(--text-primary)', marginLeft: '5px', width: '80%' }}
                                    />
                                ) : (
                                    <span style={{ marginLeft: '5px' }}>{msg.content}</span>
                                )}
                            </div>

                            {/* Separator + Bot Add Button */}
                            <div className="chat-separator">
                                <button className="chat-add-bot-btn" onClick={() => insertBotMessage(idx)} title="Add Bot Message here">
                                    <MdAdd /> Add Bot Message
                                </button>
                            </div>
                        </div>
                    ))}
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
                            matches={matches}
                        />
                        {/* Floating Send Button */}
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
