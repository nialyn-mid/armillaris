import { useState } from 'react';

export const useUIState = () => {
    const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('data');
    const [activePane, setActivePane] = useState<'import' | 'export' | 'engine' | null>(null);
    const [activeTools, setActiveTools] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('app_active_tools');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const toggleTool = (toolId: string) => {
        setActiveTools(prev => {
            const newList = prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId];
            localStorage.setItem('app_active_tools', JSON.stringify(newList));
            return newList;
        });
    };

    const togglePane = (pane: 'import' | 'export' | 'engine' | null) => {
        setActivePane(prev => prev === pane ? null : pane);
    };

    const startTutorial = (tourId: string = 'onboarding') => {
        setActiveTutorial(tourId);
    };

    return {
        activeTutorial,
        setActiveTutorial,
        activeTab,
        setActiveTab,
        activePane,
        setActivePane,
        togglePane,
        activeTools,
        setActiveTools,
        toggleTool,
        startTutorial
    };
};
