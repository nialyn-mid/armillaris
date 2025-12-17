import { useState, useEffect } from 'react';
import type { LoreEntry } from '../../../lib/types';

interface UseDataViewEntryEditingProps {
    selectedId: string | null;
    entries: LoreEntry[];
    originalEntries: LoreEntry[];
    updateEntry: (entry: LoreEntry) => void;
    deleteEntry: (id: string) => void;
    setSelectedId: (id: string | null) => void;
}

export function useDataViewEntryEditing({
    selectedId,
    entries,
    originalEntries,
    updateEntry,
    deleteEntry,
    setSelectedId
}: UseDataViewEntryEditingProps) {
    const [editLabel, setEditLabel] = useState('');
    const [editProps, setEditProps] = useState<Record<string, any>>({});

    // Sync selection to local state
    useEffect(() => {
        const entry = entries.find(e => e.id === selectedId);
        if (entry) {
            const props = { ...entry.properties };
            if (props.Description === undefined) props.Description = '';
            if (props.Keywords === undefined) props.Keywords = [];
            if (props.Meta === undefined) props.Meta = '';

            setEditLabel(entry.label);
            setEditProps(props);
        }
    }, [selectedId, originalEntries, entries]);

    // Auto-Save Effect
    useEffect(() => {
        if (!selectedId) return;

        const timer = setTimeout(() => {
            const currentEntry = entries.find(e => e.id === selectedId);
            if (!currentEntry) return;

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
        }, 800);

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

    return {
        editLabel,
        setEditLabel,
        editProps,
        setEditProps,
        handleDelete,
        handleReset
    };
}
