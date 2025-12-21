import { useState, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { MdDelete, MdContentCopy, MdSave, MdHistory, MdCleaningServices, MdArchive } from 'react-icons/md';
import ConfirmModal from '../../../shared/ui/ConfirmModal';

interface DataManagerPaneProps {
    show: boolean;
}

export function DataManagerPane({ show }: DataManagerPaneProps) {
    const {
        projects,
        activeProjectId,
        setActiveProjectId,
        versions,
        manualSave,
        createProject,
        renameProject,
        duplicateProject,
        deleteProject,
        loadVersion,
        compressOldVersions,
        pruneVersions
    } = useData();

    const [paneWidth, setPaneWidth] = useState(() => {
        const saved = localStorage.getItem('dataview_manager_width');
        return saved ? parseInt(saved, 10) : 320;
    });

    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [confirmName, setConfirmName] = useState('');
    const [newProjectName, setNewProjectName] = useState('');
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Maintenance Time Selectors (ms)
    const [compressCutoff, setCompressCutoff] = useState(7 * 24 * 60 * 60 * 1000); // Default 7 days
    const [wipeCutoff, setWipeCutoff] = useState(30 * 24 * 60 * 60 * 1000); // Default 30 days

    useEffect(() => {
        localStorage.setItem('dataview_manager_width', String(paneWidth));
    }, [paneWidth]);

    const startResizing = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = paneWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            setPaneWidth(Math.max(250, Math.min(800, newWidth)));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (!show) return null;

    const activeProject = projects.find(p => p.id === activeProjectId);

    const timeOptions = [
        { label: '1 Day', value: 1 * 24 * 60 * 60 * 1000 },
        { label: '3 Days', value: 3 * 24 * 60 * 60 * 1000 },
        { label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
        { label: '14 Days', value: 14 * 24 * 60 * 60 * 1000 },
        { label: '30 Days', value: 30 * 24 * 60 * 60 * 1000 },
        { label: '90 Days', value: 90 * 24 * 60 * 60 * 1000 },
        { label: '180 Days (6mo)', value: 180 * 24 * 60 * 60 * 1000 },
        { label: '365 Days (1yr)', value: 365 * 24 * 60 * 60 * 1000 },
    ];

    return (
        <div style={{
            position: 'relative',
            width: `${paneWidth}px`,
            borderLeft: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto'
        }}>
            <div
                onMouseDown={startResizing}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    cursor: 'ew-resize',
                    zIndex: 10
                }}
            />

            <div style={{ fontWeight: 700, fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-color)' }}>
                Data Management
                <button onClick={() => manualSave()} title="Manual Save" style={{ padding: '6px', display: 'flex', borderRadius: '4px', color: '#fff' }} className="primary"><MdSave /></button>
            </div>

            {/* Projects Section */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Projects</div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', maxHeight: '200px', overflowY: 'auto', marginBottom: '8px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                    {projects.map(proj => (
                        <div
                            key={proj.id}
                            onClick={() => setActiveProjectId(proj.id)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                backgroundColor: activeProjectId === proj.id ? 'rgba(var(--accent-color-rgb), 0.15)' : 'transparent',
                                borderLeft: activeProjectId === proj.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.9rem',
                                borderBottom: '1px solid var(--border-color)'
                            }}
                        >
                            {editingProjectId === proj.id ? (
                                <input
                                    autoFocus
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    onBlur={() => { if (editingName) renameProject(proj.id, editingName); setEditingProjectId(null); }}
                                    onKeyDown={e => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter' && editingName) { renameProject(proj.id, editingName); setEditingProjectId(null); }
                                        if (e.key === 'Escape') setEditingProjectId(null);
                                    }}
                                    style={{ flex: 1, padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-color)', color: 'var(--text-primary)', borderRadius: '3px' }}
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: activeProjectId === proj.id ? 600 : 400 }}
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingProjectId(proj.id); setEditingName(proj.name); }}
                                >
                                    {proj.name}
                                </span>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <MdContentCopy
                                    onClick={(e) => { e.stopPropagation(); duplicateProject(proj.id, `${proj.name} Copy`); }}
                                    style={{ cursor: 'pointer', opacity: 0.6 }}
                                    title="Duplicate"
                                />
                                <MdDelete
                                    onClick={(e) => { e.stopPropagation(); setShowDeleteModal('project'); }}
                                    style={{ cursor: 'pointer', opacity: 0.6, color: 'var(--danger-color)' }}
                                    title="Delete"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        placeholder="New Project Name..."
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                        onKeyDown={e => {
                            e.stopPropagation();
                            if (e.key === 'Enter' && newProjectName) { createProject(newProjectName); setNewProjectName(''); }
                        }}
                    />
                    <button
                        onClick={() => { if (newProjectName) { createProject(newProjectName); setNewProjectName(''); } }}
                        style={{ padding: '4px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}
                        className="primary"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Versions Section */}
            {activeProjectId && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        marginTop: '10px',
                        marginBottom: '10px',
                        padding: '4px 0',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active Project:</span>
                        <span style={{ color: 'var(--accent-color)' }}>{activeProject?.name}</span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <MdHistory /> Version History
                    </div>
                    <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', overflowY: 'auto', marginBottom: '15px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                        {versions.length === 0 && <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>No history yet</div>}
                        {versions.map(v => (
                            <div
                                key={v.id}
                                onClick={() => loadVersion(v.id)}
                                className="version-item"
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <span style={{ opacity: 0.9 }}>{new Date(v.timestamp).toLocaleString()}</span>
                                {v.isCompressed && <MdArchive title="Compressed" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />}
                            </div>
                        ))}
                    </div>

                    {/* Maintenance Section */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>Maintenance</div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Compress */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Compress older than:</div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <select
                                        value={compressCutoff}
                                        onChange={e => setCompressCutoff(Number(e.target.value))}
                                        style={{ flex: 1, padding: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.85rem' }}
                                    >
                                        {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                    <button
                                        onClick={() => setShowDeleteModal('compress')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 12px' }}
                                        className="secondary"
                                    >
                                        <MdArchive /> Compress
                                    </button>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '5px 0' }} />

                            {/* Feather Delete */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button
                                    onClick={() => setShowDeleteModal('feather')}
                                    className="manager-danger-btn"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontSize: '0.85rem',
                                        padding: '10px',
                                        backgroundColor: 'rgba(248, 81, 105, 0.1)',
                                        color: 'var(--danger-color)',
                                        border: '1px solid var(--danger-color)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    <MdCleaningServices /> Feather Delete
                                </button>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7, textAlign: 'center', lineHeight: '1.2' }}>
                                    Smart prune: keeps history dense near today, thinned out in the past.
                                </div>
                            </div>

                            {/* Wipe Old */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Wipe history older than:</div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <select
                                        value={wipeCutoff}
                                        onChange={e => setWipeCutoff(Number(e.target.value))}
                                        style={{ flex: 1, padding: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.85rem' }}
                                    >
                                        {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                    <button
                                        onClick={() => setShowDeleteModal('prune')}
                                        className="manager-danger-btn"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '0.8rem',
                                            padding: '6px 12px',
                                            backgroundColor: 'var(--danger-color)',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        <MdDelete /> Wipe
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showDeleteModal === 'project' && (
                <ConfirmModal
                    title="Delete Project"
                    message={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onClick={e => e.stopPropagation()}>
                            <p>Are you sure you want to delete project <b>"{activeProject?.name}"</b>? This will remove all local data and versions.</p>
                            <p>Type the project name <b>({activeProject?.name})</b> to confirm:</p>
                            <input
                                autoFocus
                                value={confirmName}
                                onChange={e => setConfirmName(e.target.value)}
                                onKeyDown={e => e.stopPropagation()}
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', width: '100%', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1rem' }}
                            />
                        </div>
                    }
                    buttons={[
                        {
                            label: 'Delete Project',
                            variant: 'danger',
                            onClick: () => {
                                if (confirmName === activeProject?.name) {
                                    deleteProject(activeProjectId!);
                                    setShowDeleteModal(null);
                                    setConfirmName('');
                                } else {
                                    alert('Project name does not match exactly.');
                                }
                            }
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            onClick: () => { setShowDeleteModal(null); setConfirmName(''); }
                        }
                    ]}
                    onClose={() => { setShowDeleteModal(null); setConfirmName(''); }}
                />
            )}

            {showDeleteModal === 'feather' && (
                <ConfirmModal
                    title="Feather Delete"
                    message="Apply smart pruning? This will keep all recent versions but thin out older ones (1/hour for last week, 1/day for month, etc.). This action is irreversible."
                    buttons={[
                        { label: 'Apply Pruning', variant: 'danger', onClick: () => { pruneVersions({ feather: true }); setShowDeleteModal(null); } },
                        { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteModal(null) }
                    ]}
                    onClose={() => setShowDeleteModal(null)}
                />
            )}

            {showDeleteModal === 'compress' && (
                <ConfirmModal
                    title="Compress History"
                    message={`Compress all versions older than ${timeOptions.find(o => o.value === compressCutoff)?.label} into .json.gz format? This saves disk space.`}
                    buttons={[
                        { label: 'Compress Now', variant: 'primary', onClick: () => { compressOldVersions(Date.now() - compressCutoff); setShowDeleteModal(null); } },
                        { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteModal(null) }
                    ]}
                    onClose={() => setShowDeleteModal(null)}
                />
            )}

            {showDeleteModal === 'prune' && (
                <ConfirmModal
                    title="Wipe Old History"
                    message={`Delete ALL versions older than ${timeOptions.find(o => o.value === wipeCutoff)?.label}? This action cannot be undone.`}
                    buttons={[
                        { label: 'Wipe Permanently', variant: 'danger', onClick: () => { pruneVersions({ cutoff: Date.now() - wipeCutoff }); setShowDeleteModal(null); } },
                        { label: 'Cancel', variant: 'secondary', onClick: () => setShowDeleteModal(null) }
                    ]}
                    onClose={() => setShowDeleteModal(null)}
                />
            )}
        </div>
    );
}
