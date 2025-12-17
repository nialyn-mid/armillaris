import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useTemplateLogic, type TemplateTabLeft, type TemplateTabRight } from './hooks/useTemplateLogic';
import { PaneHeader } from './components/PaneHeader';

interface TemplateViewProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

export interface TemplateViewHandle {
    handleSaveAll: () => Promise<void>;
    handleDiscardAll: () => void;
}

const TemplateView = forwardRef<TemplateViewHandle, TemplateViewProps>(({ onDirtyChange }, ref) => {
    // Logic Hook
    const logic = useTemplateLogic(onDirtyChange);

    // Expose actions to parent via ref
    useImperativeHandle(ref, () => ({
        handleSaveAll: logic.handleSaveAll,
        handleDiscardAll: logic.handleDiscardAll
    }));

    // Local UI State
    const [leftTab, setLeftTab] = useState<TemplateTabLeft>('script');
    const [rightTab, setRightTab] = useState<TemplateTabRight>('behavior');

    // Layout State
    const [editorSplitRatio, setEditorSplitRatio] = useState(() => {
        const saved = localStorage.getItem('template_editor_split');
        return saved ? parseFloat(saved) : 0.5;
    });

    // Editor Refs & State Restoration
    const engineEditorRef = useRef<any>(null);
    const specEditorRef = useRef<any>(null);

    const restoreEditorState = (type: 'engine' | 'spec', id: string, editor: any) => {
        if (!editor || !id) return;
        const savedJson = localStorage.getItem(`template_viewstate_${type}_${id} `);
        if (savedJson) {
            try { editor.restoreViewState(JSON.parse(savedJson)); } catch { }
        }
    };

    const saveEditorState = (type: 'engine' | 'spec', id: string) => {
        const editor = type === 'engine' ? engineEditorRef.current : specEditorRef.current;
        if (editor && id) {
            const vs = editor.saveViewState();
            if (vs) localStorage.setItem(`template_viewstate_${type}_${id} `, JSON.stringify(vs));
        }
    };

    // On Mount handlers
    const handleEngineMount: OnMount = (editor) => {
        engineEditorRef.current = editor;
        restoreEditorState('engine', logic.activeEngine, editor);
    };

    const handleSpecMount: OnMount = (editor) => {
        specEditorRef.current = editor;
        restoreEditorState('spec', logic.activeSpec, editor);
    };

    // Auto-save view state on unmount/change
    useEffect(() => {
        return () => {
            saveEditorState('engine', logic.activeEngine);
            saveEditorState('spec', logic.activeSpec);
        }
    }, [logic.activeEngine, logic.activeSpec]);

    // Resizing
    useEffect(() => localStorage.setItem('template_editor_split', String(editorSplitRatio)), [editorSplitRatio]);

    const containerRef = useRef<HTMLDivElement>(null);
    const startResizingEditors = (e: React.MouseEvent) => {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const availableWidth = container.clientWidth;
        const startX = e.clientX;
        const startRatio = editorSplitRatio;
        const onMouseMove = (moveEvent: MouseEvent) => {
            const newRatio = Math.max(0.1, Math.min(0.9, startRatio + (moveEvent.clientX - startX) / availableWidth));
            setEditorSplitRatio(newRatio);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Trigger Compilation when switching to Adapter tab or when code changes
    useEffect(() => {
        if (rightTab === 'adapter') {
            logic.compileBehavior();
        }
        if (rightTab === 'data') {
            logic.compileData();
        }
    }, [rightTab, logic.specCode, logic.activeEngine, logic.compileBehavior, logic.compileData]);

    // ---- Definitions for Headers ----

    const leftTabs = [
        { id: 'script', label: 'Engine Script (JS)', isDirty: logic.isEngineDirty },
        { id: 'spec', label: 'Engine Spec (JSON)', isDirty: logic.isEngineSpecDirty }
    ] as const;

    const rightTabs = [
        { id: 'behavior', label: 'Behavior', isDirty: logic.isSpecDirty },
        { id: 'adapter', label: 'Adapter Output', readOnly: true },
        { id: 'data', label: 'Data', readOnly: true }
    ] as const;

    const handleLeftSave = () => {
        if (leftTab === 'script') logic.handleSaveEngineScript();
        if (leftTab === 'spec') logic.handleSaveEngineSpec();
    };

    const handleRightSave = () => {
        if (rightTab === 'behavior') logic.handleSaveBehavior();
    };

    return (
        <div ref={containerRef} style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column', flex: 1 }}>

            {/* Main Editors Area */}
            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>

                {/* LEFT PANE */}
                <div style={{ flex: editorSplitRatio, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--border-color)' }}>
                    <PaneHeader
                        tabs={leftTabs as any}
                        activeTab={leftTab}
                        onTabChange={(t) => setLeftTab(t as TemplateTabLeft)}
                        onSave={handleLeftSave}
                        saveDisabled={leftTab === 'script' ? !logic.isEngineDirty : !logic.isEngineSpecDirty}
                    />

                    <div style={{ flex: 1 }}>
                        {leftTab === 'script' ? (
                            <Editor
                                key="engine-js"
                                height="100%"
                                defaultLanguage="javascript"
                                theme="vs-dark"
                                value={logic.engineCode}
                                onMount={handleEngineMount}
                                onChange={(val) => logic.setEngineCode(val || '')}
                                options={{ minimap: { enabled: false }, wordWrap: 'on', automaticLayout: true }}
                            />
                        ) : (
                            <Editor
                                key="engine-spec"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.engineSpecCode}
                                onChange={(val) => logic.setEngineSpecCode(val || '')}
                                options={{ minimap: { enabled: false }, wordWrap: 'on', automaticLayout: true }}
                            />
                        )}
                    </div>
                </div>

                {/* Split Handle */}
                <div onMouseDown={startResizingEditors} style={{ width: '4px', cursor: 'col-resize', backgroundColor: 'var(--bg-primary)', position: 'relative', zIndex: 10 }} />

                {/* RIGHT PANE */}
                <div style={{ flex: 1 - editorSplitRatio, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <PaneHeader
                        tabs={rightTabs as any}
                        activeTab={rightTab}
                        onTabChange={(t) => setRightTab(t as TemplateTabRight)}
                        onSave={rightTab === 'behavior' ? handleRightSave : undefined}
                        saveDisabled={rightTab === 'behavior' ? !logic.isSpecDirty : true}
                    />

                    <div style={{ flex: 1 }}>
                        {rightTab === 'behavior' && (
                            <Editor
                                key="behavior-json"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.specCode}
                                onMount={handleSpecMount}
                                onChange={(val) => logic.setSpecCode(val || '')}
                                options={{ minimap: { enabled: false }, wordWrap: 'on', automaticLayout: true }}
                            />
                        )}
                        {rightTab === 'adapter' && (
                            <Editor
                                key="adapter-out"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.isCompiling ? '// Compiling...' : logic.compiledCode}
                                options={{ minimap: { enabled: false }, wordWrap: 'on', automaticLayout: true, readOnly: true }}
                            />
                        )}
                        {rightTab === 'data' && (
                            <Editor
                                key="data-json"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.dataCode}
                                options={{ minimap: { enabled: false }, wordWrap: 'on', automaticLayout: true, readOnly: true }}
                            />
                        )}
                    </div>
                </div>

            </div>

            {/* Toolbar */}
            <div className="panel-toolbar" style={{ justifyContent: 'flex-end', padding: '0px 8px', borderTop: '1px solid var(--border-color)', gap: '8px' }}>
                <button
                    onClick={logic.handleDiscardAll}
                    disabled={!logic.isAnyDirty}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '2px' }}
                >
                    Discard All Files
                </button>
                <button
                    onClick={logic.handleSaveAll}
                    disabled={!logic.isAnyDirty}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '2px' }}
                >
                    Save All Files
                </button>
            </div>
        </div>
    );
});

export default TemplateView;
