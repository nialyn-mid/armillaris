import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
    id: string;
    role: 'user' | 'system';
    content: string;
}

export function useChatSession() {
    // State
    const [chatInput, setChatInput] = useState(() => {
        return localStorage.getItem('graphview_chat_input') || '';
    });

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem('graphview_chat_history');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);

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
    const addMessage = useCallback((role: 'user' | 'system', content: string) => {
        setChatHistory(prev => [...prev, { id: crypto.randomUUID(), role, content }]);
    }, []);

    const submitUserMessage = useCallback(() => {
        const val = chatInput.trim();
        if (val.length === 0) return;
        addMessage('user', val);
        setChatInput('');
    }, [chatInput, addMessage]);

    const startEditing = useCallback((msg: ChatMessage) => {
        setEditingMsgId(msg.id);
        setEditContent(msg.content);
    }, []);

    const saveEdit = useCallback((id: string) => {
        setChatHistory(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
        setEditingMsgId(null);
    }, [editContent]);

    const cancelEdit = useCallback(() => {
        setEditingMsgId(null);
        setEditContent('');
    }, []);

    const insertBotMessage = useCallback((index: number) => {
        const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'system', content: '' };
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

        submitUserMessage,
        startEditing,
        saveEdit,
        cancelEdit,
        insertBotMessage
    };
}
