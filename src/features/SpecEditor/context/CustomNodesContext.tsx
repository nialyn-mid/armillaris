import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ConfirmModal from '../../../shared/ui/ConfirmModal';

export interface CustomNodeDef {
    id: string;
    name: string;
    baseType: string;
    data: any; // Full node data (inputs, outputs, properties, graph)
    created: number;
    description?: string;
}

interface CustomNodesContextType {
    customNodes: CustomNodeDef[];
    addCustomNode: (nodeData: any, name: string, description?: string) => void;
    removeCustomNode: (id: string) => void;
    saveCustomNode: (nodeData: any, name: string, description?: string) => void;
    requestDeleteCustomNode: (id: string, name: string) => void;
}

const CustomNodesContext = createContext<CustomNodesContextType | null>(null);

const STORAGE_KEY = 'armillaris_custom_nodes';

export function CustomNodesProvider({ children }: { children: React.ReactNode }) {
    const [customNodes, setCustomNodes] = useState<CustomNodeDef[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch { return []; }
    });



    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customNodes));
    }, [customNodes]);

    const addCustomNode = useCallback((nodeData: any, name: string, description?: string) => {
        // Create a deep copy of data to ensure we snapshot it
        const dataSnapshot = JSON.parse(JSON.stringify(nodeData));

        // We might want to clean up selection state or temp flags
        // We DO want to keep the subgraph structure.
        // We MIGHT want to regenerate IDs here too? 
        // No, regenerate IDs on *instantiation* (drop).
        // Stored "template" can have fixed IDs, that's fine.

        const newNode: CustomNodeDef = {
            id: crypto.randomUUID(),
            name,
            baseType: 'Group', // Currently only groups supported for custom nodes? User implied groups.
            data: dataSnapshot,
            created: Date.now(),
            description: description || 'Custom saved group node'
        };

        setCustomNodes(prev => [...prev, newNode]);
    }, []);

    const removeCustomNode = useCallback((id: string) => {
        setCustomNodes(prev => prev.filter(n => n.id !== id));
    }, []);

    const saveCustomNode = useCallback((nodeData: any, name: string, description?: string) => {
        addCustomNode(nodeData, name, description);
    }, [addCustomNode]);

    const requestDeleteCustomNode = useCallback((id: string, name: string) => {
        setNodeToDelete({ id, name });
        setIsDeleteModalOpen(true);
    }, []);

    const handleConfirmDelete = () => {
        if (nodeToDelete) {
            removeCustomNode(nodeToDelete.id);
            setIsDeleteModalOpen(false);
            setNodeToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteModalOpen(false);
        setNodeToDelete(null);
    };

    return (
        <CustomNodesContext.Provider value={{ customNodes, addCustomNode, removeCustomNode, saveCustomNode, requestDeleteCustomNode }}>
            {children}
            {isDeleteModalOpen && (
                <ConfirmModal
                    title="Confirm Deletion"
                    message={`Are you sure you want to delete custom node "${nodeToDelete?.name}"?`}
                    buttons={[
                        {
                            label: 'Delete',
                            variant: 'danger',
                            onClick: handleConfirmDelete
                        },
                        {
                            label: 'Cancel',
                            variant: 'secondary',
                            onClick: handleCancelDelete
                        }
                    ]}
                    onClose={handleCancelDelete}
                />
            )}
        </CustomNodesContext.Provider>
    );
}

export const useCustomNodes = () => {
    const ctx = useContext(CustomNodesContext);
    if (!ctx) throw new Error("useCustomNodes must be used within CustomNodesProvider");
    return ctx;
};
