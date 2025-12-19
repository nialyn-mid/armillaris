import { useState, useEffect } from 'react';
import type { LoreEntry, GraphData, MetaDefinition } from '../../lib/types';
import { GraphBuilder } from '../../lib/graph-builder';

export const useLoreData = (showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void) => {
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [originalEntries, setOriginalEntries] = useState<LoreEntry[]>([]);
    const [entries, setEditableEntries] = useState<LoreEntry[]>([]);
    const [metaDefinitions, setMetaDefinitions] = useState<MetaDefinition[]>([]);

    // Helper to infer schema from data
    const inferMetaDefinitions = (data: LoreEntry[]): MetaDefinition[] => {
        const map = new Map<string, Map<string, 'string' | 'list' | 'relation'>>();

        data.forEach(entry => {
            const meta = String(entry.properties.Meta || 'Undefined');
            if (!map.has(meta)) map.set(meta, new Map());

            const props = map.get(meta)!;

            Object.entries(entry.properties).forEach(([key, value]) => {
                if (['Meta', 'Description', 'Keywords'].includes(key)) return;

                const currentType = props.get(key);

                let newType: 'string' | 'list' | 'relation' = 'string';
                if (Array.isArray(value)) {
                    const allIds = new Set(data.map(e => e.id));
                    const isRelation = value.length > 0 && value.every(v => typeof v === 'string' && allIds.has(v));
                    newType = isRelation ? 'relation' : 'list';
                }

                if (currentType === 'relation') return;
                if (currentType === 'list' && newType === 'relation') {
                    props.set(key, 'relation');
                    return;
                }
                if (currentType === 'list') return;

                props.set(key, newType);
            });
        });

        const definitions: MetaDefinition[] = [];
        map.forEach((propMap, metaName) => {
            const properties: any[] = [];
            propMap.forEach((type, name) => {
                properties.push({ name, type });
            });
            properties.sort((a, b) => a.name.localeCompare(b.name));
            definitions.push({ name: metaName, properties });
        });

        definitions.sort((a, b) => a.name.localeCompare(b.name));
        return definitions;
    };

    const setEntries = (newEntries: LoreEntry[]) => {
        setOriginalEntries(newEntries);
        setEditableEntries(newEntries);
        setMetaDefinitions(inferMetaDefinitions(newEntries));
    };

    const updateMetaDefinitions = (defs: MetaDefinition[]) => {
        setMetaDefinitions(defs);
    };

    const updateEntry = (updatedEntry: LoreEntry) => {
        setEditableEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    };

    const addEntry = () => {
        const newEntry: LoreEntry = {
            id: crypto.randomUUID(),
            label: 'New Entry',
            sourceType: 'manual',
            properties: {
                Description: '',
                Keywords: [],
                Meta: ''
            }
        };
        setEditableEntries(prev => [newEntry, ...prev]);
        showNotification('New entry added.');
    };

    const deleteEntry = (id: string) => {
        setEditableEntries(prev => prev.filter(e => e.id !== id));
        showNotification('Entry deleted.');
    };

    useEffect(() => {
        if (entries.length === 0) {
            setGraphData({ nodes: [], edges: [] });
            return;
        }

        const builder = new GraphBuilder(entries);
        builder.buildGraph().then(data => {
            setGraphData(data);
        });
    }, [entries]);

    return {
        graphData,
        setGraphData,
        entries,
        originalEntries,
        setEntries,
        updateEntry,
        addEntry,
        deleteEntry,
        metaDefinitions,
        updateMetaDefinitions
    };
};
