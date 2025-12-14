import Editor from '@monaco-editor/react';

export default function TemplateView() {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: '1px', backgroundColor: 'var(--border-color)' }}>
            <div style={{ backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
                <div className="unselectable" style={{ padding: '8px', background: '#252526', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                    Engine Template
                </div>
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value="// Engine Template Code Here (Placeholder)"
                    options={{ readOnly: true, minimap: { enabled: false } }}
                />
            </div>
            <div style={{ backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column' }}>
                <div className="unselectable" style={{ padding: '8px', background: '#252526', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>
                    JSON Specification
                </div>
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="vs-dark"
                    value={JSON.stringify({ placeholder: "json spec" }, null, 2)}
                    options={{ readOnly: true, minimap: { enabled: false } }}
                />
            </div>
        </div>
    );
}
