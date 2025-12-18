import { type OnMount } from '@monaco-editor/react';
import { PaneHeader } from './PaneHeader';
import { MonacoEditor } from '../../../shared/ui/MonacoEditor';
import { type TemplateTabRight } from '../hooks/useTemplateLogic';

interface RightEditorPaneProps {
    activeTab: TemplateTabRight;
    onTabChange: (tab: TemplateTabRight) => void;
    specCode: string;
    onSpecCodeChange: (val: string) => void;
    isSpecDirty: boolean;
    compiledCode: string;
    dataCode: string;
    isCompiling: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onMount?: OnMount;
}

export const RightEditorPane: React.FC<RightEditorPaneProps> = ({
    activeTab,
    onTabChange,
    specCode,
    onSpecCodeChange,
    isSpecDirty,
    compiledCode,
    dataCode,
    isCompiling,
    onSave,
    onDiscard,
    onMount
}) => {
    const tabs = [
        { id: 'behavior', label: 'Behavior', isDirty: isSpecDirty },
        { id: 'adapter_out', label: 'Adapted Behavior', readOnly: true },
        { id: 'data_out', label: 'Adapted Data', readOnly: true }
    ] as const;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <PaneHeader
                tabs={tabs as any}
                activeTab={activeTab}
                onTabChange={(t) => onTabChange(t as TemplateTabRight)}
                onSave={activeTab === 'behavior' ? onSave : undefined}
                saveDisabled={activeTab === 'behavior' ? !isSpecDirty : true}
                onDiscard={activeTab === 'behavior' ? onDiscard : undefined}
                discardDisabled={activeTab === 'behavior' ? !isSpecDirty : true}
            />

            <div style={{ flex: 1 }}>
                {activeTab === 'behavior' && (
                    <MonacoEditor
                        key="behavior-json"
                        height="100%"
                        language="json"
                        theme="vs-dark"
                        value={specCode}
                        onSave={onSave}
                        onMount={onMount}
                        onChange={(val) => onSpecCodeChange(val || '')}
                    />
                )}
                {activeTab === 'adapter_out' && (
                    <MonacoEditor
                        key="adapter-out"
                        height="100%"
                        language="json"
                        theme="vs-dark"
                        value={isCompiling ? '// Compiling...' : compiledCode}
                        options={{ readOnly: true }}
                    />
                )}
                {activeTab === 'data_out' && (
                    <MonacoEditor
                        key="data-json"
                        height="100%"
                        language="json"
                        theme="vs-dark"
                        value={dataCode}
                        options={{ readOnly: true }}
                    />
                )}
            </div>
        </div>
    );
};
