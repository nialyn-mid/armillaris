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

    // Refs for stable access in Monaco commands to avoid stale closures
    const leftTabRef = useRef(leftTab);
    const rightTabRef = useRef(rightTab);
    useEffect(() => { leftTabRef.current = leftTab; }, [leftTab]);
    useEffect(() => { rightTabRef.current = rightTab; }, [rightTab]);

    // Layout State
    const [editorSplitRatio, setEditorSplitRatio] = useState(() => {
        const saved = localStorage.getItem('template_editor_split');
        return saved ? parseFloat(saved) : 0.5;
    });

    // logicRef to prevent stale closures in Monaco commands
    const logicRef = useRef(logic);
    useEffect(() => { logicRef.current = logic; }, [logic]);

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

    // Master Shortcut Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();

                const cur = logicRef.current;
                const leftFocused = engineEditorRef.current?.hasTextFocus();
                const rightFocused = specEditorRef.current?.hasTextFocus();

                console.log(`[TemplateView] Master Ctrl+S. Left Focused: ${leftFocused}, Right Focused: ${rightFocused}`);

                if (leftFocused) {
                    if (leftTabRef.current === 'script') cur.handleSaveEngineScript();
                    else if (leftTabRef.current === 'spec') cur.handleSaveEngineSpec();
                } else if (rightFocused) {
                    if (rightTabRef.current === 'behavior') cur.handleSaveBehavior();
                } else {
                    // Fallback: Notify user that no editor is focused
                    console.log("[TemplateView] No editor text focus detected for Ctrl+S");
                    cur.showNotification('No editor focused to save', 'error');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture to preempt Monaco
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

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
                        onDiscard={() => {
                            if (leftTab === 'script') logic.handleDiscardEngineScript();
                            else logic.handleDiscardEngineSpec();
                        }}
                        discardDisabled={leftTab === 'script' ? !logic.isEngineDirty : !logic.isEngineSpecDirty}
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
                                options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true }}
                            />
                        ) : (
                            <Editor
                                key="engine-spec"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.engineSpecCode}
                                onMount={handleEngineMount}
                                onChange={(val) => logic.setEngineSpecCode(val || '')}
                                options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true }}
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
                        onDiscard={rightTab === 'behavior' ? logic.handleDiscardBehavior : undefined}
                        discardDisabled={rightTab === 'behavior' ? !logic.isSpecDirty : true}
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
                                options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true }}
                            />
                        )}
                        {rightTab === 'adapter' && (
                            <Editor
                                key="adapter-out"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.isCompiling ? '// Compiling...' : logic.compiledCode}
                                options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true, readOnly: true }}
                            />
                        )}
                        {rightTab === 'data' && (
                            <Editor
                                key="data-json"
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={logic.dataCode}
                                options={{ minimap: { enabled: true }, wordWrap: 'on', automaticLayout: true, readOnly: true }}
                            />
                        )}
                    </div>
                </div>

            </div>

            {/* Toolbar */}
            <div className="panel-toolbar" style={{ justifyContent: 'space-between', padding: '0px 8px', borderTop: '1px solid var(--border-color)', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {logic.lastCompileError && (
                        <div className="unselectable" style={{ color: '#f85169', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={logic.lastCompileError}>
                            <span style={{ fontWeight: 600 }}>Compilation Error:</span> {logic.lastCompileError}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
        </div>
    );
});

export default TemplateView;
