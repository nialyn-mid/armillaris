import { useData } from '../../context/DataContext';
import { useDataViewSelection } from './hooks/useDataViewSelection';
import { useDataViewFiltering } from './hooks/useDataViewFiltering';
import { useDataViewEntryEditing } from './hooks/useDataViewEntryEditing';
import { DataListPane } from './components/DataListPane';
import { DataEditorPane } from './components/DataEditorPane';
import { DataSchemaPane } from './components/DataSchemaPane';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import { useState } from 'react';
import './DataView.css';

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

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const confirmDelete = () => {
        handleDelete();
        setShowDeleteModal(false);
    };

    const selectedEntry = entries.find(e => e.id === selectedId);

    return (
        <div className="data-view-container">
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
                handleDelete={() => setShowDeleteModal(true)}
                handleReset={handleReset}
            />

            {showDeleteModal && (
                <ConfirmModal
                    title="Delete Entry"
                    message={`Are you sure you want to delete "${selectedEntry?.label}"? This action cannot be undone.`}
                    buttons={[
                        {
                            label: 'Delete',
                            variant: 'danger',
                            onClick: confirmDelete
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            onClick: () => setShowDeleteModal(false)
                        }
                    ]}
                    onClose={() => setShowDeleteModal(false)}
                />
            )}

            <DataSchemaPane showSchema={showSchema} />
        </div>
    );
}
