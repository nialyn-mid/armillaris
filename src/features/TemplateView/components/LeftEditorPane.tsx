import React from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { PaneHeader } from './PaneHeader';
import { type TemplateTabLeft } from '../hooks/useTemplateLogic';

interface LeftEditorPaneProps {
    activeTab: TemplateTabLeft;
    onTabChange: (tab: TemplateTabLeft) => void;
    engineCode: string;
    onEngineCodeChange: (val: string) => void;
    engineSpecCode: string;
    onEngineSpecCodeChange: (val: string) => void;
    adapterCode: string;
    onAdapterCodeChange: (val: string) => void;
    isEngineDirty: boolean;
    isEngineSpecDirty: boolean;
    isAdapterDirty: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onMount: OnMount;
}

export const LeftEditorPane: React.FC<LeftEditorPaneProps> = ({
    activeTab,
    onTabChange,
    engineCode,
    onEngineCodeChange,
    engineSpecCode,
    onEngineSpecCodeChange,
    adapterCode,
    onAdapterCodeChange,
    isEngineDirty,
    isEngineSpecDirty,
    isAdapterDirty,
    onSave,
    onDiscard,
    onMount
}) => {
    const tabs = [
        { id: 'script', label: 'Engine Script (JS)', isDirty: isEngineDirty },
        { id: 'spec', label: 'Engine Spec (JSON)', isDirty: isEngineSpecDirty },
        { id: 'adapter', label: 'Engine Adapter (JS)', isDirty: isAdapterDirty }
    ] as const;

    const currentDirty = activeTab === 'script' ? isEngineDirty : (activeTab === 'spec' ? isEngineSpecDirty : isAdapterDirty);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <PaneHeader
                tabs={tabs as any}
                activeTab={activeTab}
                onTabChange={(t) => onTabChange(t as TemplateTabLeft)}
                onSave={onSave}
                saveDisabled={!currentDirty}
                onDiscard={onDiscard}
                discardDisabled={!currentDirty}
            />

            <div style={{ flex: 1 }}>
                {activeTab === 'script' && (
                    <Editor
                        key="engine-js"
                        height="100%"
                        defaultLanguage="javascript"
                        theme="vs-dark"
                        value={engineCode}
                        onMount={onMount}
                        onChange={(val) => onEngineCodeChange(val || '')}
                        options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true }}
                    />
                )}
                {activeTab === 'spec' && (
                    <Editor
                        key="engine-spec"
                        height="100%"
                        defaultLanguage="json"
                        theme="vs-dark"
                        value={engineSpecCode}
                        onMount={onMount}
                        onChange={(val) => onEngineSpecCodeChange(val || '')}
                        options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true }}
                    />
                )}
                {activeTab === 'adapter' && (
                    <Editor
                        key="engine-adapter"
                        height="100%"
                        defaultLanguage="javascript"
                        theme="vs-dark"
                        value={adapterCode}
                        onMount={onMount}
                        onChange={(val) => onAdapterCodeChange(val || '')}
                        options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true }}
                    />
                )}
            </div>
        </div>
    );
};
