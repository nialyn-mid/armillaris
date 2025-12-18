import { useData } from '../../context/DataContext';
import { useValidation } from '../../context/ValidationContext';
import SidePane from '../../shared/ui/SidePane';
import { MdError, MdWarning, MdCheckCircle } from 'react-icons/md';
import './ExportPane.css';

interface ExportPaneProps {
    onClose: () => void;
}

export default function ExportPane({ onClose }: ExportPaneProps) {
    const { activeEngine, activeSpec, entries, showNotification } = useData();
    const { issues } = useValidation();

    const handleDownload = async () => {
        if (!activeEngine || !activeSpec) {
            showNotification('No active engine or spec selected.', 'error');
            return;
        }

        const ipc = (window as any).ipcRenderer;
        if (!ipc) return;

        try {
            // Use the same compile pipeline as CodeView to ensure consistency
            const generated = await ipc.invoke('compile-engine', activeEngine, activeSpec, entries || []);

            if (generated.startsWith('// Error') || generated.startsWith('// Minification Failed')) {
                showNotification('Export failed: Compilation error.', 'error');
                return;
            }

            // Electron Save Dialog
            const { canceled, filePath } = await ipc.invoke('dialog:save', {
                defaultPath: `${activeSpec.replace('.behavior', '')}.js`,
                filters: [{ name: 'JavaScript', extensions: ['js'] }]
            });

            if (canceled || !filePath) return;

            await ipc.invoke('fs:write', filePath, generated);
            showNotification('Exported successfully!', 'success');

        } catch (e) {
            console.error(e);
            showNotification('Export failed.', 'error');
        }
    };

    return (
        <SidePane title="Export" onClose={onClose}>
            <div className="export-container">
                <div className="export-content">
                    <p className="export-description">
                        Export the lorebook as a JavaScript file.
                    </p>
                </div>

                <div className="export-footer">
                    {issues.length > 0 ? (
                        <div className="validation-list">
                            {issues.sort((a, b) => {
                                if (a.severity === b.severity) return 0;
                                return a.severity === 'error' ? -1 : 1;
                            }).map(issue => (
                                <div key={issue.id} className={`validation-issue ${issue.severity}`}>
                                    <div className="issue-header">
                                        {issue.severity === 'error' ? (
                                            <MdError className="issue-icon" />
                                        ) : (
                                            <MdWarning className="issue-icon" />
                                        )}
                                        <span className="issue-title">
                                            {issue.severity} in {issue.source}
                                        </span>
                                    </div>
                                    <div className="issue-message">{issue.message}</div>
                                    {issue.context && (
                                        <div className="issue-context">
                                            Context: {issue.context}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="validation-success">
                            <MdCheckCircle className="success-icon" />
                            No issues found. Ready to export.
                        </div>
                    )}

                    <div className="export-actions">
                        <button
                            onClick={handleDownload}
                            style={{ width: '100%' }}
                            disabled={issues.some(i => i.severity === 'error')}
                            title={issues.some(i => i.severity === 'error') ? 'Fix errors to export' : ''}
                        >
                            Export
                        </button>
                    </div>
                </div>
            </div>
        </SidePane>
    );
}
