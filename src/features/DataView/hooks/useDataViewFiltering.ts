import { useState, useMemo } from 'react';
import type { LoreEntry } from '../../../lib/types';

export function useDataViewFiltering(entries: LoreEntry[]) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'size'>('asc');
    const [filterMeta, setFilterMeta] = useState<string>('all');

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
            if (sortOrder === 'size') {
                const sizeA = new TextEncoder().encode(JSON.stringify(a.properties)).length;
                const sizeB = new TextEncoder().encode(JSON.stringify(b.properties)).length;
                return sizeB - sizeA; // Largest first for size sort
            }
            const labelA = a.label.toLowerCase();
            const labelB = b.label.toLowerCase();
            if (sortOrder === 'asc') return labelA.localeCompare(labelB);
            return labelB.localeCompare(labelA);
        });

        return result;
    }, [entries, searchTerm, filterMeta, sortOrder]);

    return {
        searchTerm,
        setSearchTerm,
        sortOrder,
        setSortOrder,
        filterMeta,
        setFilterMeta,
        availableMetas,
        filteredEntries
    };
}
