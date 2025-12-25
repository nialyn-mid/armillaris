import { MdAdd, MdDelete, MdContentCopy } from 'react-icons/md';
import { useState } from 'react';
import ConfirmModal from '../../shared/ui/ConfirmModal';

interface SpecManagerPanelProps {
    width: number;
    setWidth: (w: number) => void;
    targetSpecName: string;
    setTargetSpecName: (name: string) => void;
    handleSave: () => void;
    handleCreateNew: () => void;
    deleteSpec: (name: string) => Promise<boolean>;
    duplicateSpec: (name: string) => Promise<void>;
    availableSpecs: string[];
    activeSpec: string | null;
    setActiveSpec: (spec: string) => void;
    nodeCount: number;
    edgeCount: number;
    isSpecDirty: boolean;
    navigateTo: (path: any[]) => void;
}

export default function SpecManagerPanel({
    width,
    setWidth,
    targetSpecName,
    setTargetSpecName,
    handleSave,
    handleCreateNew,
    deleteSpec,
    duplicateSpec,
    availableSpecs,
    activeSpec,
    setActiveSpec,
    nodeCount,
    edgeCount,
    isSpecDirty,
    navigateTo
}: SpecManagerPanelProps) {
    const [specToDelete, setSpecToDelete] = useState<string | null>(null);
    const [specToSwitchTo, setSpecToSwitchTo] = useState<string | null>(null);
    const [specToDuplicate, setSpecToDuplicate] = useState<string | null>(null);

    const onSelectSpec = (spec: string) => {
        if (isSpecDirty) {
            setSpecToSwitchTo(spec);
        } else {
            setActiveSpec(spec);
            navigateTo([]); // Reset breadcrumbs on switch
        }
    };

    const onDuplicateSpec = (spec: string) => {
        if (isSpecDirty) {
            setSpecToDuplicate(spec);
        } else {
            duplicateSpec(spec);
        }
    };

    const onNewSpec = () => {
        if (isSpecDirty) {
            setSpecToSwitchTo('__NEW__');
        } else {
            handleCreateNew();
        }
    };

    const stripExtension = (name: string) => {
        if (!name) return '';
        return name.replace('.behavior', '').replace('.json', '');
    };

    const isValidFilename = /^[a-zA-Z0-9_-]+$/.test(stripExtension(targetSpecName));

    return (
        <div style={{
            width: width,
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            {/* Resize Handle (Left Side) */}
            <div
                style={{
                    position: 'absolute', left: -4, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10
                }}
                onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startW = width;
                    const onMove = (mv: MouseEvent) => setWidth(Math.max(200, Math.min(600, startW + (startX - mv.clientX))));
                    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                }}
            />

            <div className="panel-header">
                <span>Behavior Editor</span>
            </div>
            <div className='panel-section' style={{ padding: '0px 10px' }}>
                <button
                    onClick={onNewSpec}
                    className="btn-toolbar"
                    title="New Behavior"
                    style={{ marginRight: 'auto', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                    <MdAdd size={18} /> New
                </button>
            </div>

            <div className="panel-section">
                <div className="panel-section-title">Active Behavior File</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <input
                        type="text"
                        value={stripExtension(targetSpecName)}
                        onChange={(e) => setTargetSpecName(e.target.value)}
                        placeholder="my_behavior"
                        style={{
                            flex: 1,
                            fontSize: '0.85rem',
                            border: isValidFilename ? '1px solid var(--border-color)' : '1px solid var(--danger-color)'
                        }}
                    />
                    <button
                        onClick={handleSave}
                        className="btn-primary btn-toolbar"
                        style={{ height: '100%' }}
                        disabled={!isValidFilename}
                    >
                        Save
                    </button>
                </div>
                {!isValidFilename && (
                    <div style={{ color: 'var(--danger-color)', fontSize: '0.65rem', marginTop: '2px' }}>
                        Invalid name (use alphanumeric, _ or -)
                    </div>
                )}
            </div>

            <div className="panel-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="panel-section-title" style={{ marginBottom: '5px' }}>Available Behaviors</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {availableSpecs.map(spec => {
                        const isSelected = activeSpec === spec;
                        return (
                            <div
                                key={spec}
                                className={`btn-secondary ${isSelected ? 'active' : ''}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.8rem',
                                    padding: '2px 8px',
                                    margin: '0',
                                    border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
                                    background: isSelected ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    borderRadius: '4px'
                                }}
                                onClick={() => onSelectSpec(spec)}
                            >
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {stripExtension(spec)}
                                </span>
                                <div
                                    onClick={(e) => { e.stopPropagation(); onDuplicateSpec(spec); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                        borderRadius: '2px',
                                        transition: 'all 0.2s',
                                        color: 'var(--text-secondary)',
                                        marginRight: '2px'
                                    }}
                                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
                                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                                    title="Duplicate Behavior"
                                >
                                    <MdContentCopy size={13} />
                                </div>
                                <div
                                    onClick={(e) => { e.stopPropagation(); setSpecToDelete(spec); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                        borderRadius: '2px',
                                        transition: 'all 0.2s',
                                        color: 'var(--text-secondary)'
                                    }}
                                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#d32f2f'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                                    title="Delete Behavior"
                                >
                                    <MdDelete size={14} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Compilation Status / Live Preview (Stub) */}
            <div className="panel-section" style={{ height: '80px' }}>
                <div className="panel-section-title">View Stats</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '-1em' }}>
                    Nodes: {nodeCount} <br />
                    Edges: {edgeCount}
                </div>
            </div>

            {specToSwitchTo && (
                <ConfirmModal
                    title="Unsaved Changes"
                    message="You have unsaved changes in your current behavior. If you switch now, those changes will be lost. Continue?"
                    buttons={[
                        {
                            label: 'Discard & Switch',
                            variant: 'danger',
                            onClick: () => {
                                if (specToSwitchTo === '__NEW__') {
                                    handleCreateNew();
                                } else {
                                    setActiveSpec(specToSwitchTo);
                                    navigateTo([]);
                                }
                                setSpecToSwitchTo(null);
                            }
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            onClick: () => setSpecToSwitchTo(null)
                        }
                    ]}
                    onClose={() => setSpecToSwitchTo(null)}
                />
            )}

            {specToDuplicate && (
                <ConfirmModal
                    title="Unsaved Changes"
                    message="You have unsaved changes in your current behavior. If you duplicate now, those changes will be deleted and not be included in the duplicate. Continue?"
                    buttons={[
                        {
                            label: 'Duplicate & Discard Changes',
                            variant: 'danger',
                            onClick: () => {
                                duplicateSpec(specToDuplicate);
                                setSpecToDuplicate(null);
                            }
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            onClick: () => setSpecToDuplicate(null)
                        }
                    ]}
                    onClose={() => setSpecToDuplicate(null)}
                />
            )}

            {specToDelete && (
                <ConfirmModal
                    title="Delete Behavior"
                    message={`Are you sure you want to delete "${stripExtension(specToDelete)}"? This cannot be undone.`}
                    buttons={[
                        {
                            label: 'Delete',
                            variant: 'danger',
                            onClick: async () => {
                                await deleteSpec(specToDelete);
                                setSpecToDelete(null);
                            }
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            onClick: () => setSpecToDelete(null)
                        }
                    ]}
                    onClose={() => setSpecToDelete(null)}
                />
            )}

        </div>
    );
}
