import { useMemo, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useCodeViewLogic } from './hooks/useCodeViewLogic';
import { DebugToolbar } from '../TemplateView/components/DebugToolbar';

export default function CodeView() {
    const {
        code,
        isCompiling,
        errors,
        wordWrap, setWordWrap,
        pretty, setPretty,
        handleCopy,
        activeEngine,
        activeSpec,
        refresh
    } = useCodeViewLogic();

    const editorRef = useRef<any>(null);

    const sizeInBytes = useMemo(() => new Blob([code]).size, [code]);
    const sizeDisplay = useMemo(() => {
        if (sizeInBytes < 1024) return sizeInBytes + ' B';
        return (sizeInBytes / 1024).toFixed(2) + ' KB';
    }, [sizeInBytes]);

    const handleEditorMount = (editor: any) => {
        editorRef.current = editor;
        if (pretty) {
            setTimeout(() => formatEditor(), 100);
        }
    };

    const formatEditor = () => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.updateOptions({ readOnly: false });
        editor.getAction('editor.action.formatDocument').run().finally(() => {
            editor.updateOptions({ readOnly: true });
        });
    };

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        if (pretty) {
            formatEditor();
        } else {
            editor.setValue(code);
        }
    }, [pretty, code]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e', flex: 1, minWidth: 0 }}>
            {/* Toolbar */}
            <div className="panel-toolbar unselectable" style={{ padding: '0px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '10px', fontSize: '0.8rem' }}>JS Output</div>
                    {isCompiling && <span style={{ color: 'var(--accent-color)', fontSize: '0.8rem' }}>Compiling...</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Size: {sizeDisplay}</span>
                    <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)' }}></div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setWordWrap(!wordWrap)}
                            className={`btn-secondary btn-toolbar ${wordWrap ? 'active' : ''}`}
                        >
                            Word Wrap
                        </button>
                        <button
                            onClick={() => setPretty(!pretty)}
                            className={`btn-secondary btn-toolbar ${pretty ? 'active' : ''}`}
                        >
                            Pretty Print
                        </button>
                        <button onClick={refresh} className="btn-secondary btn-toolbar" title="Re-compile">
                            Refresh
                        </button>
                        <button onClick={handleCopy} className="btn-secondary btn-toolbar">
                            Copy
                        </button>
                    </div>
                </div>
            </div>

            {/* Monaco Editor */}
            <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onMount={handleEditorMount}
                options={{
                    readOnly: true,
                    fontSize: 12,
                    minimap: { enabled: true },
                    wordWrap: wordWrap ? 'on' : 'off',
                    automaticLayout: true
                }}
            />

            {/* SHARED DEBUG TOOLBAR */}
            <DebugToolbar
                errors={errors}
                activeEngine={activeEngine}
                activeSpec={activeSpec}
            />
        </div>
    );
}
