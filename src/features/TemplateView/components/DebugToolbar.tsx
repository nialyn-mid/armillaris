import React, { useState } from 'react';

export interface CompilationError {
    source: string;
    message: string;
    stack?: string;
}

export interface CompatibilityWarning {
    source: string;
    message: string;
    category?: string;
    line?: number;
    column?: number;
}

interface DebugToolbarProps {
    errors: CompilationError[];
    warnings?: CompatibilityWarning[];
    activeEngine: string;
    activeSpec: string;
    onSaveAll?: () => void;
    onDiscardAll?: () => void;
    isAnyDirty?: boolean;
}

export const DebugToolbar: React.FC<DebugToolbarProps> = ({
    errors,
    warnings = [],
    activeEngine,
    activeSpec,
    onSaveAll,
    onDiscardAll,
    isAnyDirty
}) => {
    const [expanded, setExpanded] = useState(false);

    const hasErrors = errors.length > 0;
    const hasWarnings = warnings.length > 0;
    const statusColor = hasErrors ? '#ff5555' : (hasWarnings ? '#ffcc00' : '#55ff55');

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* Expanded Detail Panel (Pop-over) */}
            {expanded && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '400px',
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    color: '#fff',
                    padding: '16px',
                    overflowY: 'auto',
                    borderTop: `1px solid ${statusColor}`,
                    boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 100,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    lineHeight: '1.4'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>
                            DEBUG OUTPUT
                            {hasErrors && <span style={{ color: '#ff5555', marginLeft: '8px' }}>({errors.length} errors)</span>}
                            {hasWarnings && <span style={{ color: '#ffcc00', marginLeft: '8px' }}>({warnings.length} warnings)</span>}
                        </span>
                        <button
                            onClick={() => setExpanded(false)}
                            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            ✕
                        </button>
                    </div>

                    {!hasErrors && !hasWarnings ? (
                        <div style={{ color: '#55ff55' }}>No issues detected. All systems nominal.</div>
                    ) : (
                        <>
                            {errors.map((err, i) => (
                                <div key={`err-${i}`} style={{ marginBottom: '16px', color: '#ff5555' }}>
                                    <div style={{ marginBottom: '4px' }}>
                                        <span style={{
                                            color: '#fff',
                                            backgroundColor: '#880000',
                                            padding: '1px 6px',
                                            borderRadius: '3px',
                                            fontSize: '0.7rem',
                                            marginRight: '8px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {err.source}
                                        </span>
                                        <span style={{ fontWeight: 'bold' }}>{err.message}</span>
                                    </div>
                                    {err.stack && (
                                        <pre style={{
                                            margin: '4px 0 0 0',
                                            color: '#ccc',
                                            whiteSpace: 'pre-wrap',
                                            fontSize: '0.75rem',
                                            padding: '8px',
                                            backgroundColor: '#111',
                                            borderRadius: '4px'
                                        }}>
                                            {err.stack}
                                        </pre>
                                    )}
                                </div>
                            ))}

                            {warnings.map((warn, i) => (
                                <div key={`warn-${i}`} style={{ marginBottom: '12px' }}>
                                    <div style={{ marginBottom: '4px', color: '#ffcc00' }}>
                                        <span style={{
                                            color: '#000',
                                            backgroundColor: '#ffcc00',
                                            padding: '1px 6px',
                                            borderRadius: '3px',
                                            fontSize: '0.7rem',
                                            marginRight: '8px',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold'
                                        }}>
                                            {warn.source} {warn.line !== undefined ? `L${warn.line}:${warn.column}` : 'WARNING'}
                                        </span>
                                        <span style={{ fontWeight: 'bold' }}>{warn.message}</span>
                                    </div>
                                    {warn.category && <div style={{ fontSize: '0.7rem', color: '#888', marginLeft: '4px' }}>Category: {warn.category}</div>}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Main Toolbar */}
            <div className="panel-toolbar unselectable" style={{
                padding: '0px 12px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#2d2d2d',
                borderTop: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        ID: <span style={{ color: 'var(--text-primary)' }}>{activeEngine}</span>
                    </div>
                    {activeSpec && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            Spec: <span style={{ color: 'var(--text-primary)' }}>{activeSpec}</span>
                        </div>
                    )}

                    {/* Summary Trigger */}
                    <div
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: statusColor,
                            fontSize: '0.75rem',
                            flex: 1,
                            overflow: 'hidden',
                            marginLeft: '10px'
                        }}
                    >
                        <span style={{ marginRight: '8px', fontSize: '1rem' }}>●</span>
                        {hasErrors ? (
                            <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                <strong>[{errors[0].source}]</strong> {errors[0].message} {errors.length > 1 ? `(+${errors.length - 1} more)` : ''}
                            </span>
                        ) : hasWarnings ? (
                            <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                <strong>[Warning]</strong> {warnings[0].message} {warnings.length > 1 ? `(+${warnings.length - 1} more)` : ''}
                            </span>
                        ) : (
                            <span>System Nominal</span>
                        )}
                    </div>
                </div>

                {onSaveAll && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                        <button className="btn-secondary btn-toolbar" onClick={onSaveAll} disabled={!isAnyDirty}>
                            Save All
                        </button>
                        <button className="btn-secondary btn-toolbar" onClick={onDiscardAll} disabled={!isAnyDirty}>
                            Discard All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
