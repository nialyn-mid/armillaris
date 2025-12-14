import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { LoreEntry } from '../lib/types';
import PropertyEditor from './PropertyEditor';

export default function DataView() {
    const { entries, updateEntry, addEntry, deleteEntry } = useData();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Sort & Filter State
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterMeta, setFilterMeta] = useState<string>('all');

    // Details Pane State (Local)
    const [editLabel, setEditLabel] = useState('');
    const [editProps, setEditProps] = useState<Record<string, any>>({});
    const [isDirty, setIsDirty] = useState(false);

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

    // Sync selection to local state
    useEffect(() => {
        if (selectedEntry) {
            setEditLabel(selectedEntry.label);

            // Ensure required fields exist
            const props = { ...selectedEntry.properties };
            if (props.Description === undefined) props.Description = '';
            if (props.Keywords === undefined) props.Keywords = [];
            if (props.Meta === undefined) props.Meta = '';

            setEditProps(props);
            setIsDirty(false);
        }
    }, [selectedEntry]);

    const handleSave = () => {
        if (!selectedEntry) return;
        const updated: LoreEntry = {
            ...selectedEntry,
            label: editLabel,
            properties: editProps
        };
        updateEntry(updated);
        setIsDirty(false);
    };

    const handleDelete = () => {
        if (!selectedEntry) return;
        if (window.confirm('Are you sure you want to delete this entry?')) {
            deleteEntry(selectedEntry.id);
            setSelectedId(null);
        }
    };

    const handlePropsChange = (newProps: Record<string, any>) => {
        setEditProps(newProps);
        setIsDirty(true);
    };

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
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
                    {filteredEntries.map(entry => (
                        <div
                            key={entry.id}
                            onClick={() => setSelectedId(entry.id)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                backgroundColor: selectedId === entry.id ? 'var(--bg-primary)' : 'transparent',
                                borderLeft: selectedId === entry.id ? '3px solid var(--accent-color)' : '3px solid transparent',
                                borderBottom: '1px solid var(--border-color)',
                                color: selectedId === entry.id ? '#fff' : 'var(--text-primary)'
                            }}
                        >
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{entry.label}</div>
                        </div>
                    ))}
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
                                    onChange={e => { setEditLabel(e.target.value); setIsDirty(true); }}
                                    style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box' }}
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
                                    onClick={handleSave}
                                    disabled={!isDirty}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: isDirty ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                                        color: '#fff',
                                        border: 'none',
                                        cursor: isDirty ? 'pointer' : 'default',
                                        opacity: isDirty ? 1 : 0.6,
                                        borderRadius: '4px'
                                    }}
                                >
                                    Save Changes
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
        </div>
    );
}
