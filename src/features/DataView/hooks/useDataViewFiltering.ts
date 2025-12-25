import { useMemo } from 'react';
import type { LoreEntry } from '../../../lib/types';

export interface DataFilter {
    id: string;
    attribute: string;
    value: any;
    type: string;
}

export interface DataSort {
    id: string;
    attribute: string;
    order: 'asc' | 'desc';
}

export function useDataViewFiltering(
    entries: LoreEntry[],
    filters: DataFilter[],
    sorts: DataSort[],
    filterLogic: 'all' | 'any'
) {

    const availableMetas = useMemo(() => {
        const metas = new Set<string>();
        entries.forEach(e => {
            if (e.properties.Meta) metas.add(String(e.properties.Meta));
        });
        return Array.from(metas).sort();
    }, [entries]);

    const filteredEntries = useMemo(() => {
        let result = entries;

        // 1. Filtering Logic
        if (filters.length > 0) {
            result = result.filter(entry => {
                const matches = filters.map(f => {
                    let targetValue: any;
                    if (f.attribute === 'Label') targetValue = entry.label;
                    else if (f.attribute === 'ID') targetValue = entry.id;
                    else targetValue = entry.properties[f.attribute];

                    const filterValue = f.value;
                    if (filterValue === undefined || filterValue === null || filterValue === '') return true;

                    // Type-based matching
                    if (f.type === 'number') {
                        return Number(targetValue) === Number(filterValue);
                    }
                    if (f.type === 'boolean') {
                        return !!targetValue === (filterValue === 'true');
                    }
                    if (f.type === 'relation') {
                        // Match against relation labels if possible
                        if (Array.isArray(targetValue)) {
                            return targetValue.some(relId => {
                                const relEntry = entries.find(e => e.id === relId);
                                return relEntry?.label.toLowerCase().includes(String(filterValue).toLowerCase());
                            });
                        }
                        const relEntry = entries.find(e => e.id === targetValue);
                        return relEntry?.label.toLowerCase().includes(String(filterValue).toLowerCase());
                    }
                    if (f.type === 'list' || Array.isArray(targetValue)) {
                        targetValue = Array.isArray(targetValue) ? targetValue.join(', ') : String(targetValue);
                    }

                    return String(targetValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
                });

                if (filterLogic === 'all') return matches.every(m => m);
                return matches.some(m => m);
            });
        }

        // 2. Sorting Logic (Multi-level)
        if (sorts.length > 0) {
            result = [...result].sort((a, b) => {
                for (const s of sorts) {
                    let valA: any, valB: any;
                    if (s.attribute === 'Entry Size') {
                        valA = new TextEncoder().encode(JSON.stringify(a.properties)).length;
                        valB = new TextEncoder().encode(JSON.stringify(b.properties)).length;
                    } else if (s.attribute === 'Label') {
                        valA = a.label.toLowerCase();
                        valB = b.label.toLowerCase();
                    } else if (s.attribute === 'ID') {
                        valA = a.id;
                        valB = b.id;
                    } else {
                        valA = a.properties[s.attribute];
                        valB = b.properties[s.attribute];
                    }

                    if (valA === valB) continue;

                    if (typeof valA === 'string' && typeof valB === 'string') {
                        const cmp = valA.localeCompare(valB);
                        return s.order === 'asc' ? cmp : -cmp;
                    }

                    const cmp = valA > valB ? 1 : -1;
                    return s.order === 'asc' ? cmp : -cmp;
                }
                return 0;
            });
        } else {
            // Default sort by label asc
            result = [...result].sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()));
        }

        return result;
    }, [entries, filters, sorts, filterLogic]);

    return {
        availableMetas,
        filteredEntries
    };
}
