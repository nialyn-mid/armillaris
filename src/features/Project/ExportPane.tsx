import { useData } from '../../context/DataContext';
import { useValidation } from '../../context/ValidationContext';
import { Toggle } from '../../shared/ui/Toggle';
import SidePane from '../../shared/ui/SidePane';
import { MdError, MdWarning, MdCheckCircle } from 'react-icons/md';
import './ExportPane.css';

interface ExportPaneProps {
    onClose: () => void;
}

export default function ExportPane({ onClose }: ExportPaneProps) {
    const {
        activeEngine, activeSpec, entries, showNotification,
        minifyEnabled, setMinifyEnabled,
        compressEnabled, setCompressEnabled,
        mangleEnabled, setMangleEnabled,
        includeComments, setIncludeComments
    } = useData();
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
            const generated = await ipc.invoke('compile-engine', activeEngine, activeSpec, entries || [], {
                minify: minifyEnabled,
                compress: compressEnabled,
                mangle: mangleEnabled,
                comments: includeComments
            });

            if (generated.success === false) {
                showNotification('Export failed: ' + (generated.errors?.[0]?.message || 'Compilation error'), 'error');
                return;
            }

            const code = generated.code;

            // Electron Save Dialog
            const { canceled, filePath } = await ipc.invoke('dialog:save', {
                defaultPath: `${activeSpec.replace('.behavior', '')}.js`,
                filters: [{ name: 'JavaScript', extensions: ['js'] }]
            });

            if (canceled || !filePath) return;

            await ipc.invoke('fs:write', filePath, code);
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

                    <div className="panel-section">
                        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Toggle
                                label="Minify Output"
                                checked={minifyEnabled}
                                onChange={setMinifyEnabled}
                            />
                        </div>
                        {minifyEnabled && (
                            <div className="settings-subset" style={{ paddingLeft: '10px', marginTop: '10px', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <Toggle
                                    label="Compress"
                                    checked={compressEnabled}
                                    onChange={setCompressEnabled}
                                />
                                <Toggle
                                    label="Mangle"
                                    checked={mangleEnabled}
                                    onChange={setMangleEnabled}
                                />
                                <Toggle
                                    label="Include Comments"
                                    checked={includeComments}
                                    onChange={setIncludeComments}
                                />
                            </div>
                        )}
                    </div>
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
