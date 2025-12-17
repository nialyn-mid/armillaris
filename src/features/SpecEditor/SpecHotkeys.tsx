import { useEffect } from 'react';


interface SpecHotkeysProps {
    onDuplicate: () => void;
}

export const SpecHotkeys = ({ onDuplicate }: SpecHotkeysProps) => {
    // We could use useReactFlow here if needed for selection check, 
    // but onDuplicate inside hook handles filtering selected nodes.

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Shift+D
            if (event.shiftKey && (event.key === 'd' || event.key === 'D')) {
                // Check if we are focusing on an input field? 
                // Usually we don't want to duplicate if typing in a text box.
                const target = event.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                onDuplicate();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onDuplicate]);

    return null;
};
