import { MdKeyboardDoubleArrowLeft } from 'react-icons/md';
import { useData } from '../context/DataContext';

interface ExportPaneProps {
    onClose: () => void;
}

export default function ExportPane({ onClose }: ExportPaneProps) {
    const { graphData } = useData();

    const handleDownload = () => {
        if (!graphData) return;
        import('../lib/generator').then(async m => {
            const generated = await m.Generator.generate(graphData, { pretty: false });
            const blob = new Blob([generated], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'armillaris_output.js';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    };

    return (
        <div className="pane-content" style={{
            width: '300px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            height: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', margin: 0 }}>Export / Generate</h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex' }}>
                    <MdKeyboardDoubleArrowLeft />
                </button>
            </div>

            <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Generate the lorebook JavaScript/ES5 file from the current graph data.
                </p>
            </div>

            <div className="actions" style={{ marginTop: 'auto' }}>
                <button onClick={handleDownload} disabled={!graphData} style={{ width: '100%' }}>
                    Generate & Download
                </button>
            </div>
        </div>
    );
}
