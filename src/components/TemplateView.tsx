import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function TemplateView() {
    // ---- Layout State ----
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('template_sidebar_width');
        return saved ? parseInt(saved, 10) : 250;
    });

    const [editorSplitRatio, setEditorSplitRatio] = useState(() => {
        const saved = localStorage.getItem('template_editor_split');
        return saved ? parseFloat(saved) : 0.5;
    });

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('template_sidebar_collapsed') === 'true';
    });

    // ---- File Management State ----
    const [engineFiles, setEngineFiles] = useState<string[]>([]);
    const [specFiles, setSpecFiles] = useState<string[]>([]);

    const [activeEngineFile, setActiveEngineFile] = useState<string>(() => localStorage.getItem('active_engine_file') || 'engine_default.js');
    const [activeSpecFile, setActiveSpecFile] = useState<string>(() => localStorage.getItem('active_spec_file') || 'spec_default.json');

    const [engineCode, setEngineCode] = useState<string>('');
    const [specCode, setSpecCode] = useState<string>('');

    // Status Feedback
    const [status, setStatus] = useState<string>('');

    // Persistence Effects (Layout)
    useEffect(() => localStorage.setItem('template_sidebar_width', String(sidebarWidth)), [sidebarWidth]);
    useEffect(() => localStorage.setItem('template_editor_split', String(editorSplitRatio)), [editorSplitRatio]);
    useEffect(() => localStorage.setItem('template_sidebar_collapsed', String(isSidebarCollapsed)), [isSidebarCollapsed]);

    // Persistence Effects (Selection)
    useEffect(() => localStorage.setItem('active_engine_file', activeEngineFile), [activeEngineFile]);
    useEffect(() => localStorage.setItem('active_spec_file', activeSpecFile), [activeSpecFile]);

    const ipc = (window as any).ipcRenderer;

    // Load File Lists
    useEffect(() => {
        if (!ipc) return;

        Promise.all([
            ipc.invoke('get-templates', 'engine'),
            ipc.invoke('get-templates', 'spec')
        ]).then(([engines, specs]) => {
            setEngineFiles(engines);
            setSpecFiles(specs);

            // Ensure valid selection
            if (engines.length && !engines.includes(activeEngineFile)) setActiveEngineFile(engines[0]);
            if (specs.length && !specs.includes(activeSpecFile)) setActiveSpecFile(specs[0]);
        }).catch(err => console.error("Failed to list templates:", err));
    }, []);

    // Load Engine Content
    useEffect(() => {
        if (!ipc || !activeEngineFile) return;
        ipc.invoke('read-template', activeEngineFile)
            .then((content: string) => setEngineCode(content))
            .catch((err: any) => console.error(err));
    }, [activeEngineFile]);

    // Load Spec Content
    useEffect(() => {
        if (!ipc || !activeSpecFile) return;
        ipc.invoke('read-template', activeSpecFile)
            .then((content: string) => setSpecCode(content))
            .catch((err: any) => console.error(err));
    }, [activeSpecFile]);


    const handleSave = async () => {
        if (!ipc) return;
        setStatus('Saving...');
        try {
            await Promise.all([
                ipc.invoke('save-template', activeEngineFile, engineCode),
                ipc.invoke('save-template', activeSpecFile, specCode)
            ]);
            setStatus('Saved!');
            setTimeout(() => setStatus(''), 2000);
        } catch (e) {
            console.error(e);
            setStatus('Error Saving');
        }
    };

    // ---- Resize Handlers ----
    const containerRef = useRef<HTMLDivElement>(null);

    // Resize Sidebar (Right Edge)
    const startResizingSidebar = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = startX - moveEvent.clientX; // Dragging left increases width
            const newWidth = Math.max(150, Math.min(600, startWidth + deltaX));
            setSidebarWidth(newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Resize Editors Split (Middle)
    const startResizingEditors = (e: React.MouseEvent) => {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;

        const availableWidth = container.clientWidth - (isSidebarCollapsed ? 0 : sidebarWidth);
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
        <div ref={containerRef} style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

            {/* Main Area (Editors) */}
            <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>

                {/* Engine Template (Left) */}
                <div style={{ flex: editorSplitRatio, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--border-color)' }}>
                    <div className="unselectable" style={{ padding: '8px', background: '#252526', color: '#fff', fontSize: '0.8rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Engine Template (JS)</span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{activeEngineFile}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={engineCode}
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
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{activeSpecFile}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            theme="vs-dark"
                            value={specCode}
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

            {/* Sidebar (Right) */}
            <div style={{
                width: isSidebarCollapsed ? '30px' : `${sidebarWidth}px`,
                flexShrink: 0,
                borderLeft: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.1s ease-out'
            }}>
                {/* Sidebar Resize Handle (Only if not collapsed) */}
                {!isSidebarCollapsed && (
                    <div
                        onMouseDown={startResizingSidebar}
                        style={{
                            position: 'absolute',
                            width: '4px',
                            height: '100%',
                            cursor: 'ew-resize',
                            marginLeft: '-2px',
                            zIndex: 10
                        }}
                    />
                )}

                {/* Header / Toggle */}
                <div
                    className="unselectable"
                    style={{
                        padding: '8px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-secondary)',
                        height: '35px'
                    }}
                >
                    {!isSidebarCollapsed && <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Configuration</span>}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? '«' : '»'}
                    </button>
                </div>

                {!isSidebarCollapsed && (
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {/* Status Message */}
                        {status && <div style={{ color: '#aaa', fontSize: '0.8rem', textAlign: 'center' }}>{status}</div>}

                        {/* File Selections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Template</label>
                            <select
                                value={activeEngineFile}
                                onChange={(e) => setActiveEngineFile(e.target.value)}
                                style={{
                                    padding: '6px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '4px'
                                }}
                            >
                                {engineFiles.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>JSON Spec</label>
                            <select
                                value={activeSpecFile}
                                onChange={(e) => setActiveSpecFile(e.target.value)}
                                style={{
                                    padding: '6px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '4px'
                                }}
                            >
                                {specFiles.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '5px 0' }}></div>

                        <button
                            onClick={handleSave}
                            style={{
                                padding: '8px',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                            }}
                        >
                            Save Changes
                        </button>

                    </div>
                )}

                {isSidebarCollapsed && (
                    <div style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        padding: '10px 0',
                        textAlign: 'center',
                        flex: 1,
                        cursor: 'pointer'
                    }} onClick={() => setIsSidebarCollapsed(false)}>
                        Configuration
                    </div>
                )}
            </div>
        </div>
    );
}
