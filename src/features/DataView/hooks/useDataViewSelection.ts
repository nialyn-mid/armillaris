import { useState, useEffect } from 'react';

export function useDataViewSelection() {
    const [selectedId, setSelectedId] = useState<string | null>(() => {
        return localStorage.getItem('dataview_selected_id');
    });

    useEffect(() => {
        if (selectedId) {
            localStorage.setItem('dataview_selected_id', selectedId);
        } else {
            localStorage.removeItem('dataview_selected_id');
        }
    }, [selectedId]);

    return {
        selectedId,
        setSelectedId
    };
}
