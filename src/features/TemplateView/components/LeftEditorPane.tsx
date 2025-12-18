import { type OnMount } from '@monaco-editor/react';
import { PaneHeader } from './PaneHeader';
import { MonacoEditor } from '../../../shared/ui/MonacoEditor';
import { type TemplateTabLeft } from '../hooks/useTemplateLogic';

interface LeftEditorPaneProps {
    activeTab: TemplateTabLeft;
    onTabChange: (tab: TemplateTabLeft) => void;
    engineCode: string;
    onEngineCodeChange: (val: string) => void;
    devEngineCode: string;
    onDevEngineCodeChange: (val: string) => void;
    engineSpecCode: string;
    onEngineSpecCodeChange: (val: string) => void;
    adapterCode: string;
    onAdapterCodeChange: (val: string) => void;
    isEngineDirty: boolean;
    isDevEngineDirty: boolean;
    isEngineSpecDirty: boolean;
    isAdapterDirty: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onMount?: OnMount;
}

export const LeftEditorPane: React.FC<LeftEditorPaneProps> = ({
    activeTab,
    onTabChange,
    engineCode,
    onEngineCodeChange,
    devEngineCode,
    onDevEngineCodeChange,
    engineSpecCode,
    onEngineSpecCodeChange,
    adapterCode,
    onAdapterCodeChange,
    isEngineDirty,
    isDevEngineDirty,
    isEngineSpecDirty,
    isAdapterDirty,
    onSave,
    onDiscard,
    onMount
}) => {
    const tabs = [
        { id: 'script', label: 'Engine Script (JS)', isDirty: isEngineDirty },
        { id: 'dev_script', label: 'Dev Engine (JS)', isDirty: isDevEngineDirty },
        { id: 'spec', label: 'Engine Spec (JSON)', isDirty: isEngineSpecDirty },
        { id: 'adapter', label: 'Engine Adapter (JS)', isDirty: isAdapterDirty }
    ] as const;

    const currentDirty =
        activeTab === 'script' ? isEngineDirty :
            activeTab === 'dev_script' ? isDevEngineDirty :
                activeTab === 'spec' ? isEngineSpecDirty :
                    isAdapterDirty;

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
                    <MonacoEditor
                        key="engine-js"
                        height="100%"
                        language="javascript"
                        theme="vs-dark"
                        value={engineCode}
                        onSave={onSave}
                        onMount={onMount}
                        onChange={(val) => onEngineCodeChange(val || '')}
                    />
                )}
                {activeTab === 'dev_script' && (
                    <MonacoEditor
                        key="dev-engine-js"
                        height="100%"
                        language="javascript"
                        theme="vs-dark"
                        value={devEngineCode}
                        onSave={onSave}
                        onMount={onMount}
                        onChange={(val) => onDevEngineCodeChange(val || '')}
                    />
                )}
                {activeTab === 'spec' && (
                    <MonacoEditor
                        key="engine-spec"
                        height="100%"
                        language="json"
                        theme="vs-dark"
                        value={engineSpecCode}
                        onSave={onSave}
                        onMount={onMount}
                        onChange={(val) => onEngineSpecCodeChange(val || '')}
                    />
                )}
                {activeTab === 'adapter' && (
                    <MonacoEditor
                        key="engine-adapter"
                        height="100%"
                        language="javascript"
                        theme="vs-dark"
                        value={adapterCode}
                        onSave={onSave}
                        onMount={onMount}
                        onChange={(val) => onAdapterCodeChange(val || '')}
                    />
                )}
            </div>
        </div>
    );
};
