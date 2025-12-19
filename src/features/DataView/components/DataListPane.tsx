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
        <div className="data-list-pane">
            <div className="data-list-header">
                <button onClick={addEntry} className="data-list-add-btn">+ New Entry</button>
                <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="form-control"
                />
                <div className="flex-row gap-xs">
                    <select
                        value={filterMeta}
                        onChange={(e) => setFilterMeta(e.target.value)}
                        className="form-control form-select flex-1"
                    >
                        <option value="all">All Meta</option>
                        {availableMetas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="form-control form-select"
                        style={{ width: '70px' }}
                    >
                        <option value="asc">A-Z</option>
                        <option value="desc">Z-A</option>
                    </select>
                </div>
            </div>

            <div className="data-list-content scrollbar-hidden">
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
                            className={`data-list-item ${selectedId === entry.id ? 'selected' : ''} ${!isMetaDefined ? 'invalid' : ''}`}
                        >
                            <div className="data-list-item-title">
                                <span>{entry.label}</span>
                                {!isMetaDefined && <span title="Undefined Meta Type">⚠️</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="data-list-summary">
                {filteredEntries.length} Entries
            </div>
        </div>
    );
}
