import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { useTemplateLogic, type TemplateTabLeft, type TemplateTabRight } from './hooks/useTemplateLogic';
import { DebugToolbar } from './components/DebugToolbar';
import { LeftEditorPane } from './components/LeftEditorPane';
import { RightEditorPane } from './components/RightEditorPane';

interface TemplateViewProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

export interface TemplateViewHandle {
    handleSaveAll: () => Promise<void>;
    handleDiscardAll: () => void;
}

const TemplateView = forwardRef<TemplateViewHandle, TemplateViewProps>(({ onDirtyChange }, ref) => {
    // Logic Hook (composed of specialized sub-hooks)
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

    // Editor Refs for focus detection
    const leftEditorRef = useRef<any>(null);
    const rightEditorRef = useRef<any>(null);

    // Refs for stable access in master shortcut listener to avoid stale closures
    const stateRef = useRef({ leftTab, rightTab, logic });
    useEffect(() => { stateRef.current = { leftTab, rightTab, logic }; }, [leftTab, rightTab, logic]);

    // Monaco Save State Logic
    const restoreEditorState = (type: 'left' | 'right', id: string, editor: any) => {
        if (!editor || !id) return;
        const savedJson = localStorage.getItem(`template_viewstate_${type}_${id}`);
        if (savedJson) {
            try { editor.restoreViewState(JSON.parse(savedJson)); } catch { }
        }
    };

    const saveEditorState = (type: 'left' | 'right', id: string) => {
        const editor = type === 'left' ? leftEditorRef.current : rightEditorRef.current;
        if (editor && id) {
            const vs = editor.saveViewState();
            if (vs) localStorage.setItem(`template_viewstate_${type}_${id}`, JSON.stringify(vs));
        }
    };

    const handleLeftMount: OnMount = (editor) => {
        leftEditorRef.current = editor;
        restoreEditorState('left', logic.activeEngine, editor);
    };

    const handleRightMount: OnMount = (editor) => {
        rightEditorRef.current = editor;
        restoreEditorState('right', logic.activeSpec, editor);
    };

    // Master Shortcut Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();

                const { leftTab, rightTab, logic: cur } = stateRef.current;
                const leftFocused = leftEditorRef.current?.hasTextFocus();
                const rightFocused = rightEditorRef.current?.hasTextFocus();

                if (leftFocused) {
                    if (leftTab === 'script') cur.handleSaveEngineScript();
                    else if (leftTab === 'spec') cur.handleSaveEngineSpec();
                    else if (leftTab === 'adapter') cur.handleSaveAdapter();
                } else if (rightFocused) {
                    if (rightTab === 'behavior') cur.handleSaveBehavior();
                } else {
                    cur.showNotification('No editor focused to save', 'error');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

    // Selection/View State Persistence
    useEffect(() => {
        return () => {
            saveEditorState('left', logic.activeEngine);
            saveEditorState('right', logic.activeSpec);
        }
    }, [logic.activeEngine, logic.activeSpec]);

    useEffect(() => localStorage.setItem('template_editor_split', String(editorSplitRatio)), [editorSplitRatio]);

    // Resizing Logic
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

    // Trigger Compilation on tab switches
    useEffect(() => {
        if (rightTab === 'adapter_out') logic.compileBehavior();
        if (rightTab === 'data') logic.compileData();
    }, [rightTab, logic.specCode, logic.activeEngine, logic.compileBehavior, logic.compileData]);

    return (
        <div ref={containerRef} style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column', flex: 1 }}>

            {/* Main Editors Area */}
            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>

                {/* LEFT PANE */}
                <div style={{ flex: editorSplitRatio, display: 'flex', borderRight: '1px solid var(--border-color)', minWidth: 0 }}>
                    <LeftEditorPane
                        activeTab={leftTab}
                        onTabChange={setLeftTab}
                        engineCode={logic.engineCode}
                        onEngineCodeChange={logic.setEngineCode}
                        engineSpecCode={logic.engineSpecCode}
                        onEngineSpecCodeChange={logic.setEngineSpecCode}
                        adapterCode={logic.adapterCode}
                        onAdapterCodeChange={logic.setAdapterCode}
                        isEngineDirty={logic.isEngineDirty}
                        isEngineSpecDirty={logic.isEngineSpecDirty}
                        isAdapterDirty={logic.isAdapterDirty}
                        onSave={logic.handleSaveEngineScript /* This is just a fallback for PaneHeader toggle */}
                        onDiscard={logic.handleDiscardEngineScript}
                        onMount={handleLeftMount}
                    />
                </div>

                {/* Split Handle */}
                <div onMouseDown={startResizingEditors} style={{ width: '4px', cursor: 'col-resize', backgroundColor: 'var(--bg-primary)', position: 'relative', zIndex: 10 }} />

                {/* RIGHT PANE */}
                <div style={{ flex: 1 - editorSplitRatio, display: 'flex', minWidth: 0 }}>
                    <RightEditorPane
                        activeTab={rightTab}
                        onTabChange={setRightTab}
                        specCode={logic.specCode}
                        onSpecCodeChange={logic.setSpecCode}
                        isSpecDirty={logic.isSpecDirty}
                        compiledCode={logic.compiledCode}
                        dataCode={logic.dataCode}
                        isCompiling={logic.isCompiling}
                        onSave={logic.handleSaveBehavior}
                        onDiscard={logic.handleDiscardBehavior}
                        onMount={handleRightMount}
                    />
                </div>
            </div>

            {/* SHARED DEBUG TOOLBAR */}
            <DebugToolbar
                errors={logic.errors}
                activeEngine={logic.activeEngine}
                activeSpec={logic.activeSpec}
                onSaveAll={logic.handleSaveAll}
                onDiscardAll={logic.handleDiscardAll}
                isAnyDirty={logic.isAnyDirty}
            />
        </div>
    );
});

export default TemplateView;
