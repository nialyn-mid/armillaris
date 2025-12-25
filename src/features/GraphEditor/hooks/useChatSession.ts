import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
    id: string;
    role: 'user' | 'system';
    content: string;
    date: Date | string;
}

export function useChatSession() {
    // State
    const [chatInput, setChatInput] = useState(() => {
        return localStorage.getItem('graphview_chat_input') || '';
    });

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem('graphview_chat_history');
            const parsed = saved ? JSON.parse(saved) : [];
            // Ensure every message has a date
            return parsed.map((m: any) => ({
                ...m,
                date: m.date || new Date()
            }));
        } catch { return []; }
    });
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);

    // Custom Timing State
    const [useCurrentTime, setUseCurrentTime] = useState(true);
    const [customTime, setCustomTime] = useState<string>(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    });

    // Editing State
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Persistence
    useEffect(() => {
        localStorage.setItem('graphview_chat_input', chatInput);
    }, [chatInput]);

    useEffect(() => {
        localStorage.setItem('graphview_chat_history', JSON.stringify(chatHistory));
    }, [chatHistory]);

    // Actions
    const addMessage = useCallback((role: 'user' | 'system', content: string, date?: Date | string) => {
        setChatHistory(prev => [...prev, { id: crypto.randomUUID(), role, content, date: date || new Date() }]);
    }, []);

    const submitUserMessage = useCallback(() => {
        const val = chatInput.trim();
        if (val.length === 0) return;

        const timestamp = useCurrentTime ? new Date() : new Date(customTime);
        addMessage('user', val, timestamp);
        setChatInput('');
    }, [chatInput, addMessage, useCurrentTime, customTime]);

    const startEditing = useCallback((msg: ChatMessage) => {
        setEditingMsgId(msg.id);
        setEditContent(msg.content);
    }, []);

    const saveEdit = useCallback((id: string) => {
        setChatHistory(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
        setEditingMsgId(null);
    }, [editContent]);

    const setMessageDate = useCallback((id: string, date: Date | string) => {
        setChatHistory(prev => prev.map(m => m.id === id ? { ...m, date } : m));
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingMsgId(null);
        setEditContent('');
    }, []);

    const deleteMessage = useCallback((id: string) => {
        setChatHistory(prev => prev.filter(m => m.id !== id));
    }, []);

    const insertBotMessage = useCallback((index: number) => {
        const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'system', content: '', date: new Date() };
        setChatHistory(prev => {
            const next = [...prev];
            next.splice(index + 1, 0, newMsg);
            return next;
        });
        startEditing(newMsg);
    }, [startEditing]);

    return {
        chatInput,
        setChatInput,
        chatHistory,
        setChatHistory,
        isChatHistoryOpen,
        setIsChatHistoryOpen,
        isChatCollapsed,
        setIsChatCollapsed,
        editingMsgId,
        editContent,
        setEditContent,

        useCurrentTime,
        setUseCurrentTime,
        customTime,
        setCustomTime,

        submitUserMessage,
        addMessage,
        startEditing,
        saveEdit,
        cancelEdit,
        deleteMessage,
        setMessageDate,
        insertBotMessage
    };
}
