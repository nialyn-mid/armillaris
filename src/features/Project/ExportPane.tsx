import { useData } from '../../context/DataContext';
import { useValidation } from '../../context/ValidationContext';
import { Toggle } from '../../shared/ui/Toggle';
import SidePane from '../../shared/ui/SidePane';
import { SizeBar, type SizeBreakdown } from '../../shared/ui/SizeBar';
import { useState, useEffect, useCallback } from 'react';
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
        includeComments, setIncludeComments,
        setActiveTab, toggleTool, isSpecDirty, setPendingTab
    } = useData();
    const { issues } = useValidation();

    const [breakdown, setBreakdown] = useState<SizeBreakdown | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);

    const runCompilation = useCallback(async () => {
        if (!activeEngine || !activeSpec) return;
        setIsCompiling(true);
        const ipc = (window as any).ipcRenderer;
        try {
            const res = await ipc.invoke('compile-engine', activeEngine, activeSpec, entries || [], {
                minify: minifyEnabled,
                compress: compressEnabled,
                mangle: mangleEnabled,
                comments: includeComments
            });
            if (res.success) {
                setBreakdown(res.sizeBreakdown);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCompiling(false);
        }
    }, [activeEngine, activeSpec, entries, minifyEnabled, compressEnabled, mangleEnabled, includeComments]);

    useEffect(() => {
        runCompilation();
    }, [runCompilation]);

    const handleDownload = async () => {
        if (!activeEngine || !activeSpec) {
            showNotification('No active engine or spec selected.', 'error');
            return;
        }

        const ipc = (window as any).ipcRenderer;
        if (!ipc) return;

        setIsCompiling(true);
        try {
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
        } finally {
            setIsCompiling(false);
        }
    };

    const handleSizeBarClick = () => {
        if (isSpecDirty) {
            setPendingTab('output');
            // We need to ensure that when they confirm, size_visualization is also toggled.
            // But App.tsx's confirmNavigation only sets activeTab.
            // We'll just assume they'll have to toggle it or we can try to force it via localstorage?
            // Actually, we can just toggle it now, and if they cancel navigation, it doesn't matter much.
            toggleTool('size_visualization');
        } else {
            setActiveTab('output');
            toggleTool('size_visualization');
        }
    };

    return (
        <SidePane id="panel-export" title="Export Manager" onClose={onClose}>
            <div className="export-container">
                <div className="export-content scrollbar-hidden">

                    {/* Description Section */}
                    <div className="panel-section">
                        <div className="panel-section-title flex-row items-center gap-xs">
                            <MdDescription size={16} />
                            <span>Description</span>
                        </div>
                        <div className="export-description">
                            Export your lorebook script. You can verify the content & size in the Output View.
                        </div>
                    </div>

                    {/* Size Visualization Section */}
                    {breakdown && (
                        <div className="panel-section">
                            <div className="panel-section-title">
                                <span>Export Size</span>
                                {isCompiling && <span className="compiling-indicator">Updating...</span>}
                            </div>
                            <div className="p-sm">
                                <SizeBar breakdown={breakdown} onClick={handleSizeBarClick} />
                            </div>
                        </div>
                    )}

                    {/* Settings Section */}
                    <div className="panel-section border-b">
                        <div className="panel-section-title flex-row items-center gap-xs">
                            <MdSettings size={16} />
                            <span>Compilation Settings</span>
                        </div>
                        <div className="flex-column gap-sm p-sm">
                            <Toggle
                                label="Minify Output"
                                checked={minifyEnabled}
                                onChange={setMinifyEnabled}
                            />
                            {minifyEnabled && (
                                <div className="settings-subset">
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

                {/* Validation Status */}
                <div className="panel-section" style={{ border: 'none', borderTop: '1px solid var(--border-color)' }}>
                    <div className="panel-section-title flex-row items-center gap-xs">
                        <MdFactCheck size={16} />
                        <span>Validation Status</span>
                    </div>
                    <div className="p-sm">
                        {issues.length > 0 ? (
                            <div className="validation-list">
                                {issues.sort((a, b) => {
                                    if (a.severity === b.severity) return 0;
                                    return a.severity === 'error' ? -1 : 1;
                                }).map(issue => (
                                    <div key={issue.id} className={`validation-issue-card ${issue.severity}`}>
                                        <div className={`validation-issue-header ${issue.severity}`}>
                                            {issue.severity === 'error' ? <MdError /> : <MdWarning />}
                                            <span>{issue.severity} in {issue.source}</span>
                                        </div>
                                        <div className="validation-issue-msg">{issue.message}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="validation-success-box">
                                <MdCheckCircle size={18} />
                                <span>No issues found. Ready for deployment.</span>
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
                        <MdCloudDownload /> Export Script
                    </button>
                    <div className="export-footer-info">
                        Target: {activeSpec?.replace('.behavior', '') || 'None'}
                    </div>
                </div>
            </div>
        </SidePane>
    );
}
