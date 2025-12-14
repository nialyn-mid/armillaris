import { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useData } from '../context/DataContext';

interface TemplateViewProps {
    onDirtyChange?: (isDirty: boolean) => void;
}

export default function TemplateView({ onDirtyChange }: TemplateViewProps) {
    const { showNotification, activeEngine, activeSpec } = useData();

    // ---- Layout State ----
    const [editorSplitRatio, setEditorSplitRatio] = useState(() => {
        const saved = localStorage.getItem('template_editor_split');
        return saved ? parseFloat(saved) : 0.5;
    });

    const [engineCode, setEngineCode] = useState<string>('');
    const [specCode, setSpecCode] = useState<string>('');

    // Dirty Tracking
    const originalEngineCode = useRef<string>('');
    const originalSpecCode = useRef<string>('');

    // Editor Instances for Scroll Persistence
    const engineEditorRef = useRef<any>(null);
    const specEditorRef = useRef<any>(null);

    const saveEditorState = (type: 'engine' | 'spec', id: string) => {
        const editor = type === 'engine' ? engineEditorRef.current : specEditorRef.current;
        if (editor && id) {
            const viewState = editor.saveViewState();
            if (viewState) {
                localStorage.setItem(`template_viewstate_${type}_${id} `, JSON.stringify(viewState));
            }
        }
    };

    const restoreEditorState = (type: 'engine' | 'spec', id: string) => {
        const editor = type === 'engine' ? engineEditorRef.current : specEditorRef.current;
        if (editor && id) {
            const savedJson = localStorage.getItem(`template_viewstate_${type}_${id} `);
            if (savedJson) {
                try {
                    const viewState = JSON.parse(savedJson);
                    editor.restoreViewState(viewState);
                } catch (e) {
                    console.warn("Failed to restore view state", e);
                }
            }
        }
    };

    const handleEngineMount: OnMount = (editor) => {
        engineEditorRef.current = editor;
        restoreEditorState('engine', activeEngine);
    };

    const handleSpecMount: OnMount = (editor) => {
        specEditorRef.current = editor;
        restoreEditorState('spec', activeSpec);
    };

    // Persistence Effects (Layout)
    useEffect(() => localStorage.setItem('template_editor_split', String(editorSplitRatio)), [editorSplitRatio]);

    // Save ViewState on Unmount or Change
    useEffect(() => {
        return () => {
            saveEditorState('engine', activeEngine);
            saveEditorState('spec', activeSpec);
        };
    }, [activeEngine, activeSpec]);


    const ipc = (window as any).ipcRenderer;

    // Load Engine Content
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        ipc.invoke('get-engine-details', activeEngine)
            .then((details: { js: string, devSpec: string }) => {
                setEngineCode(details.js);
                originalEngineCode.current = details.js;
                setTimeout(() => restoreEditorState('engine', activeEngine), 50);
            })
            .catch((err: any) => console.error(err));
    }, [activeEngine]);

    // Load Spec Content
    useEffect(() => {
        if (!ipc || !activeEngine || !activeSpec) return;

        ipc.invoke('read-spec', activeEngine, activeSpec)
            .then((content: string) => {
                setSpecCode(content);
                originalSpecCode.current = content;
                setTimeout(() => restoreEditorState('spec', activeSpec), 50);
            })
            .catch((err: any) => console.error(err));
    }, [activeEngine, activeSpec]);

    // Warn on Unsaved Changes (Browser Close/Reload) & Notify Parent
    useEffect(() => {
        const isDirty = (engineCode !== originalEngineCode.current) || (specCode !== originalSpecCode.current);

        if (onDirtyChange) {
            onDirtyChange(isDirty);
        }

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [engineCode, specCode, onDirtyChange]);

    const handleSave = async () => {
        if (!ipc) return;

        try {
            await Promise.all([
                ipc.invoke('save-engine', activeEngine, engineCode),
                ipc.invoke('save-spec', activeEngine, activeSpec, specCode)
            ]);

            // Update references
            originalEngineCode.current = engineCode;
            originalSpecCode.current = specCode;

            if (onDirtyChange) onDirtyChange(false);

            showNotification('Templates Saved Successfully', 'success');
        } catch (e) {
            console.error(e);
            showNotification('Failed to Save Templates', 'error');
        }
    };

    // ---- Resize Handlers ----
    const containerRef = useRef<HTMLDivElement>(null);

    // Resize Editors Split (Middle)
    const startResizingEditors = (e: React.MouseEvent) => {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;

        const availableWidth = container.clientWidth;
        const startX = e.clientX;
        const startRatio = editorSplitRatio;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaRatio = deltaX / availableWidth;
            const newRatio = Math.max(0.1, Math.min(0.9, startRatio + deltaRatio));
            setEditorSplitRatio(newRatio);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div ref={containerRef} style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column', flex: 1 }}>

            {/* Toolbar for Save (since sidebar is gone) */}
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSave}
                    disabled={engineCode === originalEngineCode.current && specCode === originalSpecCode.current}
                    style={{
                        padding: '6px 12px',
                        background: (engineCode !== originalEngineCode.current || specCode !== originalSpecCode.current) ? '#2ea043' : 'transparent',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        opacity: (engineCode !== originalEngineCode.current || specCode !== originalSpecCode.current) ? 1 : 0.5
                    }}
                >
                    Save Changes
                </button>
            </div>

            {/* Main Area (Editors) */}
            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>

                {/* Engine Template (Left) */}
                <div style={{ flex: editorSplitRatio, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--border-color)' }}>
                    <div className="unselectable" style={{ padding: '8px', background: '#252526', color: '#fff', fontSize: '0.8rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Engine Template (JS)</span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{activeEngine}/engine.js</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={engineCode}
                            onMount={handleEngineMount}
                            onChange={(val) => setEngineCode(val || '')}
                            options={{
                                minimap: { enabled: false },
                                wordWrap: 'on',
                                automaticLayout: true
                            }}
                        />
                    </div>
                </div>

                {/* Split Handle (Editors) */}
                <div
                    onMouseDown={startResizingEditors}
                    style={{
                        width: '4px',
                        cursor: 'col-resize',
                        backgroundColor: 'var(--bg-primary)',
                        borderLeft: '1px solid var(--border-color)',
                        borderRight: '1px solid var(--border-color)',
                        position: 'relative',
                        zIndex: 10
                    }}
                />

                {/* JSON Spec (Right of Left) */}
                <div style={{ flex: 1 - editorSplitRatio, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div className="unselectable" style={{ padding: '8px', background: '#252526', color: '#fff', fontSize: '0.8rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>JSON Spec</span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{activeEngine}/{activeSpec}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            theme="vs-dark"
                            value={specCode}
                            onMount={handleSpecMount}
                            onChange={(val) => setSpecCode(val || '')}
                            options={{
                                minimap: { enabled: false },
                                wordWrap: 'on',
                                automaticLayout: true
                            }}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
