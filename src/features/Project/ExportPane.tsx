import { useData } from '../../context/DataContext';
import { useValidation } from '../../context/ValidationContext';
import { Toggle } from '../../shared/ui/Toggle';
import SidePane from '../../shared/ui/SidePane';
import {
    MdError,
    MdWarning,
    MdCheckCircle,
    MdCloudDownload,
    MdSettings,
    MdDescription,
    MdFactCheck
} from 'react-icons/md';
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
        <SidePane id="panel-export" title="Export Manager" onClose={onClose}>
            <div className="export-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
                <div className="export-content scrollbar-hidden" style={{ flex: 1, overflowY: 'auto' }}>

                    {/* Description Section */}
                    <div className="panel-section">
                        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MdDescription size={16} />
                            <span>Description</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', padding: '0 4px' }}>
                            Generate a production-ready JavaScript bundle of your behavioral logic, optimized for the active engine.
                        </div>
                    </div>

                    {/* Settings Section */}
                    <div className="panel-section" style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MdSettings size={16} />
                            <span>Compilation Settings</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 4px' }}>
                            <Toggle
                                label="Minify Output"
                                checked={minifyEnabled}
                                onChange={setMinifyEnabled}
                            />
                            {minifyEnabled && (
                                <div className="settings-subset" style={{
                                    paddingLeft: '14px',
                                    marginTop: '4px',
                                    borderLeft: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <Toggle
                                        label="Enable Compression"
                                        checked={compressEnabled}
                                        onChange={setCompressEnabled}
                                    />
                                    <Toggle
                                        label="Mangle Variable Names"
                                        checked={mangleEnabled}
                                        onChange={setMangleEnabled}
                                    />
                                    <Toggle
                                        label="Preserve Comments"
                                        checked={includeComments}
                                        onChange={setIncludeComments}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Validation Section */}
                <div className="panel-section" style={{ border: 'none', borderTop: '1px solid var(--border-color)' }}>
                    <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MdFactCheck size={16} />
                        <span>Validation Status</span>
                    </div>
                    <div style={{ padding: '0 4px' }}>
                        {issues.length > 0 ? (
                            <div className="validation-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {issues.sort((a, b) => {
                                    if (a.severity === b.severity) return 0;
                                    return a.severity === 'error' ? -1 : 1;
                                }).map(issue => (
                                    <div key={issue.id} style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: issue.severity === 'error' ? 'rgba(248, 81, 105, 0.05)' : 'rgba(255, 170, 17, 0.05)',
                                        border: `1px solid ${issue.severity === 'error' ? 'rgba(248, 81, 105, 0.2)' : 'rgba(255, 170, 17, 0.2)'}`,
                                        borderLeft: `3px solid ${issue.severity === 'error' ? 'var(--danger-color)' : 'var(--warning-color)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px', color: issue.severity === 'error' ? 'var(--danger-color)' : 'var(--warning-color)', textTransform: 'uppercase' }}>
                                            {issue.severity === 'error' ? <MdError /> : <MdWarning />}
                                            <span>{issue.severity} in {issue.source}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', opacity: 0.9, lineHeight: '1.4' }}>{issue.message}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="validation-success" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px',
                                background: 'rgba(56, 139, 253, 0.1)',
                                border: '1px solid rgba(56, 139, 253, 0.2)',
                                borderRadius: '8px',
                                color: 'var(--accent-color)',
                                fontSize: '0.8rem'
                            }}>
                                <MdCheckCircle size={18} />
                                <span style={{ fontWeight: 500 }}>No issues found. Ready for deployment.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="panel-section" style={{ marginTop: 'auto', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: 'none' }}>
                    <button
                        className="btn-action outline"
                        onClick={handleDownload}
                        disabled={issues.some(i => i.severity === 'error')}
                        title={issues.some(i => i.severity === 'error') ? 'Fix errors to export' : ''}
                    >
                        <MdCloudDownload /> Export Bundle
                    </button>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px', opacity: 0.8 }}>
                        Target: {activeSpec?.replace('.behavior', '') || 'None'}
                    </div>
                </div>
            </div>
        </SidePane>
    );
}
