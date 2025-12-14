import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PropertyEditor from './PropertyEditor';
import MetaSchemaEditor from './MetaSchemaEditor';

interface DataViewProps {
    showSchema: boolean;
}

export default function DataView({ showSchema }: DataViewProps) {
    const { entries, updateEntry, addEntry, deleteEntry, originalEntries, metaDefinitions } = useData();

    // Persistence: Selection
    const [selectedId, setSelectedId] = useState<string | null>(() => {
        return localStorage.getItem('dataview_selected_id');
    });

    useEffect(() => {
        if (selectedId) {
            localStorage.setItem('dataview_selected_id', selectedId);
        } else {
            localStorage.removeItem('dataview_selected_id');
        }
    }, [selectedId]);

    const [searchTerm, setSearchTerm] = useState('');

    // Sort & Filter State
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterMeta, setFilterMeta] = useState<string>('all');

    // Details Pane State (Local)
    const [editLabel, setEditLabel] = useState('');
    const [editProps, setEditProps] = useState<Record<string, any>>({});

    // Derived unique Meta values
    const availableMetas = useMemo(() => {
        const metas = new Set<string>();
        entries.forEach(e => {
            if (e.properties.Meta) metas.add(String(e.properties.Meta));
        });
        return Array.from(metas).sort();
    }, [entries]);

    const filteredEntries = useMemo(() => {
        let result = entries;

        // 1. Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(e =>
                e.label.toLowerCase().includes(lower) ||
                e.id.includes(lower)
            );
        }

        // 2. Filter by Meta
        if (filterMeta !== 'all') {
            result = result.filter(e => String(e.properties.Meta) === filterMeta);
        }

        // 3. Sort
        result = [...result].sort((a, b) => {
            const labelA = a.label.toLowerCase();
            const labelB = b.label.toLowerCase();
            if (sortOrder === 'asc') return labelA.localeCompare(labelB);
            return labelB.localeCompare(labelA);
        });

        return result;
    }, [entries, searchTerm, filterMeta, sortOrder]);

    const selectedEntry = useMemo(() =>
        entries.find(e => e.id === selectedId),
        [entries, selectedId]);

    // Sync selection to local state & Snapshot
    useEffect(() => {
        if (selectedEntry) {
            // Check if we are switching to a DIFFERENT entry or just updating same one
            // We want to capture snapshot only on SWITCH.
            // Actually, selectedEntry updates on auto-save too. 
            // We rely on selectedId changing to reset snapshot? No, selectedId stays same.

            // Simplified: We only sync FROM selectedEntry if content is different from what we are editing?
            // This is tricky with auto-save.
            // Better strategy:
            // When selectedId changes, load everything and set Snapshot.
        }
    }, [selectedEntry]);

    // Sync selection to local state
    // Triggers on Selection Change OR New Data Load (Import)
    useEffect(() => {
        const entry = entries.find(e => e.id === selectedId);
        if (entry) {
            // Load state
            const props = { ...entry.properties };
            if (props.Description === undefined) props.Description = '';
            if (props.Keywords === undefined) props.Keywords = [];
            if (props.Meta === undefined) props.Meta = '';

            setEditLabel(entry.label);
            setEditProps(props);
        }
    }, [selectedId, originalEntries]); // originalEntries signals a fresh Import


    // Auto-Save Effect
    useEffect(() => {
        if (!selectedId) return;

        const timer = setTimeout(() => {
            // Compare with current global state to avoid redundant updates/loops
            const currentEntry = entries.find(e => e.id === selectedId);
            if (!currentEntry) return;

            // Simple dirty check (stringify)
            const isDirty =
                currentEntry.label !== editLabel ||
                JSON.stringify(currentEntry.properties) !== JSON.stringify(editProps);

            if (isDirty) {
                updateEntry({
                    ...currentEntry,
                    label: editLabel,
                    properties: editProps
                });
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timer);
    }, [editLabel, editProps, selectedId, entries, updateEntry]);


    const handleDelete = () => {
        if (!selectedId) return;
        if (window.confirm('Are you sure you want to delete this entry?')) {
            deleteEntry(selectedId);
            setSelectedId(null);
        }
    };

    const handleReset = () => {
        if (!selectedId) return;
        const original = originalEntries.find(e => e.id === selectedId);
        if (original) {
            const props = { ...original.properties };
            if (props.Description === undefined) props.Description = '';
            if (props.Keywords === undefined) props.Keywords = [];
            if (props.Meta === undefined) props.Meta = '';

            setEditLabel(original.label);
            setEditProps(props);
        } else {
            alert("Original entry not found (this might be a new entry).");
        }
    };

    const handlePropsChange = (newProps: Record<string, any>) => {
        setEditProps(newProps);
    };

    const [schemaPanelWidth, setSchemaPanelWidth] = useState(() => {
        const saved = localStorage.getItem('dataview_schema_width');
        return saved ? parseInt(saved, 10) : 320;
    });

    useEffect(() => {
        localStorage.setItem('dataview_schema_width', String(schemaPanelWidth));
    }, [schemaPanelWidth]);

    const startResizingSchema = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = schemaPanelWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            // Min 250, Max 800
            setSchemaPanelWidth(Math.max(250, Math.min(800, newWidth)));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flex: 1 }}>
            {/* List Pane */}
            <div style={{
                width: '300px',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-secondary)'
            }}>
                <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        onClick={addEntry}
                        style={{ width: '100%', padding: '8px', background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                    >
                        + New Entry
                    </button>
                    <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <select
                            value={filterMeta}
                            onChange={(e) => setFilterMeta(e.target.value)}
                            style={{ flex: 1, padding: '4px', fontSize: '0.8rem' }}
                        >
                            <option value="all">All Meta</option>
                            {availableMetas.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                            style={{ width: '60px', padding: '4px', fontSize: '0.8rem' }}
                        >
                            <option value="asc">A-Z</option>
                            <option value="desc">Z-A</option>
                        </select>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredEntries.map(entry => {
                        const isMetaDefined = metaDefinitions.some(d => d.name === entry.properties.Meta);
                        return (
                            <div
                                key={entry.id}
                                onClick={() => setSelectedId(entry.id)}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedId === entry.id ? 'var(--bg-primary)' : 'transparent',
                                    borderLeft: selectedId === entry.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                                    borderBottom: '1px solid var(--border-color)',
                                    color: selectedId === entry.id ? '#fff' : (isMetaDefined ? 'var(--text-primary)' : '#ff6b6b') // Red for invalid meta
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{entry.label}</span>
                                    {!isMetaDefined && <span title="Undefined Meta Type">⚠️</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ padding: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                    {filteredEntries.length} Entries
                </div>
            </div>

            {/* Editor Pane */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', padding: '20px' }}>
                {selectedEntry ? (
                    <>
                        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Label</label>
                                <input
                                    type="text"
                                    value={editLabel}
                                    onChange={e => { setEditLabel(e.target.value); }}
                                    style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box' }}
                                    readOnly={true} // Label editing is complex with ID tracking, make read-only for now unless logic added? Original code allowed it but auto-saved.
                                // Returning functionality as it was in valid snippet:
                                />
                            </div>
                            <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'transparent',
                                        color: '#ff6b6b',
                                        border: '1px solid #ff6b6b',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={handleReset}
                                    title="Revert to original import state"
                                    style={{
                                        padding: '10px 15px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        color: '#e2b340',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Properties</label>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <PropertyEditor
                                    properties={editProps}
                                    onChange={handlePropsChange}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            ID: {selectedEntry.id}
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                        Select an entry to edit details
                    </div>
                )}
            </div>

            {/* Schema Panel */}
            {showSchema && (
                <div style={{
                    position: 'relative',
                    width: `${schemaPanelWidth}px`,
                    borderLeft: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0
                }}>
                    {/* Resize Handle */}
                    <div
                        onMouseDown={startResizingSchema}
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
                    <MetaSchemaEditor />
                </div>
            )}
        </div>
    );
}
