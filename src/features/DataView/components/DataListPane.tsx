import type { LoreEntry, MetaDefinition } from '../../../lib/types';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { MdLibraryBooks, MdError, MdDragIndicator, MdAdd, MdClose, MdSort, MdFilterList } from 'react-icons/md';
import type { DataFilter, DataSort } from '../hooks/useDataViewFiltering';
import { useState, useMemo } from 'react';

interface DataListPaneProps {
    filteredEntries: LoreEntry[];
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    filters: DataFilter[];
    setFilters: React.Dispatch<React.SetStateAction<DataFilter[]>>;
    sorts: DataSort[];
    setSorts: React.Dispatch<React.SetStateAction<DataSort[]>>;
    filterLogic: 'all' | 'any';
    setFilterLogic: (logic: 'all' | 'any') => void;
    availableMetas: string[];
    metaDefinitions: MetaDefinition[];
    addEntry: () => void;
}

export function DataListPane({
    filteredEntries,
    selectedId,
    setSelectedId,
    filters,
    setFilters,
    sorts,
    setSorts,
    filterLogic,
    setFilterLogic,
    metaDefinitions,
    addEntry
}: DataListPaneProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragType, setDragType] = useState<'filter' | 'sort' | null>(null);

    // Collect all unique attribute names across all schemas
    const allAttributes = useMemo(() => {
        const attrs = new Set<string>(['Label', 'ID', 'Meta', 'Personality', 'Scenario', 'Example Dialogs', 'Keywords']);
        metaDefinitions.forEach(def => {
            def.properties.forEach(p => attrs.add(p.name));
        });
        return Array.from(attrs).sort();
    }, [metaDefinitions]);

    const getAttributeType = (attr: string): string => {
        if (['Label', 'ID', 'Personality', 'Scenario', 'Example Dialogs'].includes(attr)) return 'string';
        if (attr === 'Meta') return 'string';
        if (attr === 'Keywords') return 'list';

        // Check meta definitions
        for (const def of metaDefinitions) {
            const prop = def.properties.find(p => p.name === attr);
            if (prop) return prop.type;
        }
        return 'string';
    };

    const handleAddFilter = () => {
        const id = Math.random().toString(36).substr(2, 9);
        setFilters([...filters, { id, attribute: 'Label', value: '', type: 'string' }]);
    };

    const handleAddSort = () => {
        const id = Math.random().toString(36).substr(2, 9);
        setSorts([...sorts, { id, attribute: 'Label', order: 'asc' }]);
    };

    const onFilterChange = (index: number, f: Partial<DataFilter>) => {
        const newFilters = [...filters];
        newFilters[index] = { ...newFilters[index], ...f };
        // If attribute changed, update type
        if (f.attribute) {
            newFilters[index].type = getAttributeType(f.attribute);
            // Reset value if type changed significantly? Maybe just keep it.
        }
        setFilters(newFilters);
    };

    const onSortChange = (index: number, s: Partial<DataSort>) => {
        const newSorts = [...sorts];
        newSorts[index] = { ...newSorts[index], ...s };
        setSorts(newSorts);
    };

    const removeFilter = (index: number) => {
        setFilters(filters.filter((_, i) => i !== index));
    };

    const removeSort = (index: number) => {
        setSorts(sorts.filter((_, i) => i !== index));
    };

    // Native DND
    const handleDragStart = (e: React.DragEvent, index: number, type: 'filter' | 'sort') => {
        setDraggedIndex(index);
        setDragType(type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number, type: 'filter' | 'sort') => {
        e.preventDefault();
        if (dragType !== type || draggedIndex === null || draggedIndex === index) return;

        const list = type === 'filter' ? [...filters] : [...sorts];
        const item = list[draggedIndex];
        list.splice(draggedIndex, 1);
        list.splice(index, 0, item as any);

        if (type === 'filter') setFilters(list as DataFilter[]);
        else setSorts(list as DataSort[]);

        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragType(null);
    };

    return (
        <div id="data-list-pane" className="data-list-pane">
            <div className="data-list-header-complex">
                <button onClick={addEntry} className="data-list-add-btn mb-md">+ New Entry</button>

                <div className="flex-row justify-between items-center mb-xs">
                    <span className="data-list-section-title"><MdFilterList /> Filters</span>
                    <div className="filter-logic-toggle">
                        <span onClick={() => setFilterLogic('all')} className={filterLogic === 'all' ? 'active' : ''}>ALL</span>
                        <span onClick={() => setFilterLogic('any')} className={filterLogic === 'any' ? 'active' : ''}>ANY</span>
                    </div>
                </div>

                <div className="data-list-filters-list">
                    {filters.map((f, i) => (
                        <div
                            key={f.id}
                            className={`filter-row ${draggedIndex === i && dragType === 'filter' ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, i, 'filter')}
                            onDragOver={(e) => handleDragOver(e, i, 'filter')}
                            onDragEnd={handleDragEnd}
                        >
                            <MdDragIndicator className="drag-handle" />
                            <select
                                value={f.attribute}
                                onChange={e => onFilterChange(i, { attribute: e.target.value })}
                                className="filter-attr-select dark-dropdown"
                            >
                                {allAttributes.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>

                            {f.type === 'boolean' ? (
                                <select
                                    value={String(f.value)}
                                    onChange={e => onFilterChange(i, { value: e.target.value })}
                                    className="filter-value-input dark-dropdown"
                                >
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            ) : (
                                <input
                                    type={f.type === 'number' ? 'number' : 'text'}
                                    value={f.value}
                                    onChange={e => onFilterChange(i, { value: e.target.value })}
                                    placeholder="Value..."
                                    className="filter-value-input"
                                />
                            )}
                            <button onClick={() => removeFilter(i)} className="filter-remove-btn"><MdClose /></button>
                        </div>
                    ))}
                    <button onClick={handleAddFilter} className="add-filter-btn"><MdAdd /> Filter</button>
                </div>

                <div className="flex-row justify-between items-center mb-xs mt-md">
                    <span className="data-list-section-title"><MdSort /> Sorts</span>
                </div>

                <div className="data-list-sorts-list">
                    {sorts.map((s, i) => (
                        <div
                            key={s.id}
                            className={`sort-row ${draggedIndex === i && dragType === 'sort' ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, i, 'sort')}
                            onDragOver={(e) => handleDragOver(e, i, 'sort')}
                            onDragEnd={handleDragEnd}
                        >
                            <MdDragIndicator className="drag-handle" />
                            <select
                                value={s.attribute}
                                onChange={e => onSortChange(i, { attribute: e.target.value })}
                                className="sort-attr-select dark-dropdown"
                            >
                                {allAttributes.map(a => <option key={a} value={a}>{a}</option>)}
                                <option value="Entry Size">Entry Size</option>
                            </select>
                            <button
                                onClick={() => onSortChange(i, { order: s.order === 'asc' ? 'desc' : 'asc' })}
                                className="sort-order-toggle"
                            >
                                {s.order === 'asc' ? 'ASC' : 'DESC'}
                            </button>
                            <button onClick={() => removeSort(i)} className="sort-remove-btn"><MdClose /></button>
                        </div>
                    ))}
                    <button onClick={handleAddSort} className="add-sort-btn"><MdAdd /> Sort</button>
                </div>
            </div>

            <div className="data-list-content scrollbar-hidden">
                {filteredEntries.length === 0 && (
                    <EmptyState
                        icon={<MdLibraryBooks />}
                        message="No Entries Found"
                        description="Try adjusting your filters or sorts"
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
                                <div className="flex-row items-center gap-xs">
                                    <span className="entry-size-tag">
                                        {(() => {
                                            const content = JSON.stringify(entry.properties);
                                            const size = new TextEncoder().encode(content).length;
                                            if (size < 1024) return size + ' B';
                                            return (size / 1024).toFixed(1) + ' KB';
                                        })()}
                                    </span>
                                    {!isMetaDefined && <MdError title="Undefined Meta Type" style={{ color: 'var(--danger-color)' }} />}
                                </div>
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
