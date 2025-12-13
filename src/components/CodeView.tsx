import { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useData } from '../context/DataContext';
import { Generator } from '../lib/generator';

export default function CodeView() {
    const { graphData } = useData();
    const [wordWrap, setWordWrap] = useState<boolean>(() => {
        return localStorage.getItem('codeview_wordwrap') === 'true';
    });
    const [pretty, setPretty] = useState<boolean>(() => {
        return localStorage.getItem('codeview_pretty') === 'true';
    });

    // Valid dependencies for saving state
    useEffect(() => localStorage.setItem('codeview_wordwrap', String(wordWrap)), [wordWrap]);
    useEffect(() => localStorage.setItem('codeview_pretty', String(pretty)), [pretty]);

    const [code, setCode] = useState<string>('// Loading...');

    // Initial code generation
    useEffect(() => {
        if (!graphData) {
            setCode('// No Graph Data Loaded');
            return;
        }

        // Debounce or just run? React effect cleanup helps a bit
        let active = true;
        Generator.generate(graphData, { pretty }).then(result => {
            if (active) setCode(result);
        });

        return () => { active = false; };
    }, [graphData, pretty]);

    const sizeInBytes = useMemo(() => new Blob([code]).size, [code]);
    const sizeDisplay = useMemo(() => {
        if (sizeInBytes < 1024) return sizeInBytes + ' B';
        return (sizeInBytes / 1024).toFixed(2) + ' KB';
    }, [sizeInBytes]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
    };

    const toggleStyle = (active: boolean) => ({
        background: active ? '#0e639c' : 'transparent',
        color: active ? '#fff' : '#cccccc',
        border: '1px solid #333',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '0.75rem',
        borderRadius: '3px',
        userSelect: 'none' as const, // Fix for TS
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e' }}>
            {/* Toolbar */}
            <div className="unselectable" style={{
                height: '40px',
                backgroundColor: '#252526',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                gap: '15px',
                color: '#cccccc',
                fontSize: '0.8rem'
            }}>
                <div style={{ fontWeight: 600, color: '#fff', marginRight: '10px' }}>JS Output</div>

                <button
                    onClick={() => setWordWrap(!wordWrap)}
                    style={toggleStyle(wordWrap)}
                >
                    Word Wrap
                </button>

                <button
                    onClick={() => setPretty(!pretty)}
                    style={toggleStyle(pretty)}
                >
                    Pretty Print
                </button>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: '#888' }}>Size: {sizeDisplay}</span>
                    <button
                        onClick={handleCopy}
                        style={{
                            background: '#0e639c',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }}
                    >
                        Copy to Clipboard
                    </button>
                </div>
            </div>

            {/* Monaco Editor */}
            <div style={{ flex: 1 }}>
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={code}
                    options={{
                        readOnly: true,
                        wordWrap: wordWrap ? 'on' : 'off',
                        minimap: { enabled: true },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true
                    }}
                />
            </div>
        </div>
    );
}
