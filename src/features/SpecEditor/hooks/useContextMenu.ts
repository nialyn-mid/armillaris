import { useState, useEffect, useCallback } from 'react';

export function useContextMenu() {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const handleClose = () => setContextMenu(null);
        if (contextMenu) {
            window.addEventListener('mousedown', handleClose);
            window.addEventListener('wheel', handleClose);
            window.addEventListener('resize', handleClose);
        }
        return () => {
            window.removeEventListener('mousedown', handleClose);
            window.removeEventListener('wheel', handleClose);
            window.removeEventListener('resize', handleClose);
        };
    }, [contextMenu]);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    return { contextMenu, onContextMenu, closeContextMenu };
}
