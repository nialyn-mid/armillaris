import type { LoreEntry, MetaDefinition } from '../../../lib/types';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { MdLibraryBooks } from 'react-icons/md';

interface DataListPaneProps {
    filteredEntries: LoreEntry[];
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    filterMeta: string;
    setFilterMeta: (meta: string) => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (order: 'asc' | 'desc') => void;
    availableMetas: string[];
    metaDefinitions: MetaDefinition[];
    addEntry: () => void;
}

export function DataListPane({
    filteredEntries,
    selectedId,
    setSelectedId,
    searchTerm,
    setSearchTerm,
    filterMeta,
    setFilterMeta,
    sortOrder,
    setSortOrder,
    availableMetas,
    metaDefinitions,
    addEntry
}: DataListPaneProps) {
    return (
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
                {filteredEntries.length === 0 && (
                    <EmptyState
                        icon={<MdLibraryBooks />}
                        message="No Entries Found"
                        description={searchTerm ? "Try adjusting your search or filters" : "Import or create entries to get started"}
                    />
                )}
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
    );
}
