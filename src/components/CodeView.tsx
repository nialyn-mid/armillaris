import { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useData } from '../context/DataContext';
import { Generator } from '../lib/generator';

export default function CodeView() {
    const { graphData, showNotification } = useData();
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

        const generateCode = async () => {
            try {
                const ipc = (window as any).ipcRenderer;
                let engineTemplate: string | undefined;
                let jsonSpec: any | undefined;

                if (ipc) {
                    const engineFile = localStorage.getItem('active_engine_file');
                    const specFile = localStorage.getItem('active_spec_file');

                    if (!engineFile || !specFile) {
                        if (active) setCode('// Error: No template selected in Template View.');
                        return;
                    }

                    try {
                        // Load Engine
                        try {
                            engineTemplate = await ipc.invoke('read-template', engineFile);
                        } catch (e) {
                            throw new Error(`Failed to load Engine Template '${engineFile}': ${e}`);
                        }

                        // Load Spec
                        try {
                            const specContent = await ipc.invoke('read-template', specFile);
                            jsonSpec = JSON.parse(specContent);
                        } catch (e) {
                            throw new Error(`Failed to load JSON Spec '${specFile}': ${e}`);
                        }

                    } catch (err: any) {
                        console.error(err);
                        if (active) setCode('// Template Error:\n// ' + err.message);
                        return;
                    }
                } else {
                    // Fallback for non-electron env?
                    return;
                }

                const result = await Generator.generate(graphData, { pretty, engineTemplate, jsonSpec });
                if (active) setCode(result);
            } catch (e) {
                if (active) setCode('// Generation Error: ' + String(e));
            }
        };

        generateCode();

        return () => { active = false; };
    }, [graphData, pretty]);

    const sizeInBytes = useMemo(() => new Blob([code]).size, [code]);
    const sizeDisplay = useMemo(() => {
        if (sizeInBytes < 1024) return sizeInBytes + ' B';
        return (sizeInBytes / 1024).toFixed(2) + ' KB';
    }, [sizeInBytes]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        showNotification('Code copied to clipboard!');
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e', flex: 1 }}>
            {/* Toolbar */}
            <div className="panel-toolbar">
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '10px', fontSize: '0.8rem' }}>JS Output</div>

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

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Size: {sizeDisplay}</span>
                    <button
                        onClick={handleCopy}
                        className="btn-secondary btn-toolbar"
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
