import { useData } from '../../context/DataContext';
import { useDataViewSelection } from './hooks/useDataViewSelection';
import { useDataViewFiltering } from './hooks/useDataViewFiltering';
import { useDataViewEntryEditing } from './hooks/useDataViewEntryEditing';
import { DataListPane } from './components/DataListPane';
import { DataEditorPane } from './components/DataEditorPane';
import { DataSchemaPane } from './components/DataSchemaPane';

interface DataViewProps {
    showSchema: boolean;
}

export default function DataView({ showSchema }: DataViewProps) {
    const {
        entries,
        updateEntry,
        addEntry,
        deleteEntry,
        originalEntries,
        metaDefinitions
    } = useData();

    // Hooks
    const { selectedId, setSelectedId } = useDataViewSelection();

    const {
        searchTerm, setSearchTerm,
        sortOrder, setSortOrder,
        filterMeta, setFilterMeta,
        availableMetas,
        filteredEntries
    } = useDataViewFiltering(entries);

    const {
        editLabel, setEditLabel,
        editProps, setEditProps,
        handleDelete,
        handleReset
    } = useDataViewEntryEditing({
        selectedId,
        entries,
        originalEntries,
        updateEntry,
        deleteEntry,
        setSelectedId
    });

    const selectedEntry = entries.find(e => e.id === selectedId);

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flex: 1 }}>
            <DataListPane
                filteredEntries={filteredEntries}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterMeta={filterMeta}
                setFilterMeta={setFilterMeta}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                availableMetas={availableMetas}
                metaDefinitions={metaDefinitions}
                addEntry={addEntry}
            />

            <DataEditorPane
                selectedEntry={selectedEntry}
                editLabel={editLabel}
                setEditLabel={setEditLabel}
                editProps={editProps}
                setEditProps={setEditProps}
                handleDelete={handleDelete}
                handleReset={handleReset}
            />

            <DataSchemaPane showSchema={showSchema} />
        </div>
    );
}
