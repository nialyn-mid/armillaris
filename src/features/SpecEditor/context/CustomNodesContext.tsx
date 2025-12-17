import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 99999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#252526', border: '1px solid #454545', borderRadius: '4px',
                        padding: '16px', minWidth: '300px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        color: '#eee', fontFamily: 'sans-serif'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>Confirm Deletion</h3>
                        <div style={{ marginBottom: '24px', fontSize: '13px', color: '#ccc' }}>
                            Are you sure you want to delete custom node "{nodeToDelete?.name}"?
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={handleCancelDelete}
                                style={{
                                    background: 'transparent', border: '1px solid #555', color: '#ccc',
                                    padding: '6px 12px', cursor: 'pointer', borderRadius: '2px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                style={{
                                    background: '#d32f2f', border: 'none', color: '#fff',
                                    padding: '6px 12px', cursor: 'pointer', borderRadius: '2px'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CustomNodesContext.Provider>
    );
}

export const useCustomNodes = () => {
    const ctx = useContext(CustomNodesContext);
    if (!ctx) throw new Error("useCustomNodes must be used within CustomNodesProvider");
    return ctx;
};
