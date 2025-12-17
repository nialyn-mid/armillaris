import { useCallback, useState } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';

export const useSpecGraphState = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [masterGraph, setMasterGraph] = useState<any>(null);

    const [viewPath, setViewPath] = useState<{ id: string, label: string }[]>([]);

    // We need to sync local nodes/edges with the engineSpec at the current viewPath.
    // This is complex because 'nodes' state is local to ReactFlow.
    // When viewPath changes, we need to load from engineSpec.
    // When nodes change, we need to update engineSpec.

    // Actually, simpler approach:
    // maintain 'currentGraph' derived from engineSpec + viewPath.
    // useNodesState initializes from it? No, useNodesState is imperative.

    // Let's expose viewPath and setViewPath.
    // And helper 'getCurrentGraph(spec, path)'
    // And helper 'updateGraphInSpec(spec, path, {nodes, edges})'

    const handleNodeUpdate = useCallback((id: string, newValues: any) => {
        setNodes((nds) => {
            return nds.map((node) => {
                if (node.id === id) {
                    // Update keys: 'inputs', 'outputs', 'label', 'graph', 'color', 'ports' go to root data.
                    // Everything else goes to data.values.
                    const rootKeys = ['inputs', 'outputs', 'label', 'graph', 'color', 'ports'];
                    const rootUpdates: any = {};
                    const valueUpdates: any = { ...node.data.values };

                    Object.keys(newValues).forEach(key => {
                        if (rootKeys.includes(key)) {
                            rootUpdates[key] = newValues[key];
                        } else {
                            valueUpdates[key] = newValues[key];
                        }
                    });

                    const updatedNode = {
                        ...node,
                        data: {
                            ...node.data,
                            ...rootUpdates,
                            values: valueUpdates
                        }
                    };

                    // Handle Group Resize (Style)
                    if (node.type === 'Group' && (newValues.width || newValues.height)) {
                        if (node.style) {
                            updatedNode.style = { ...node.style, width: newValues.width, height: newValues.height };
                        }
                    }
                    return updatedNode;
                }
                return node;
            });
        });
    }, [setNodes]);

    const handleDuplicateNode = useCallback((id: string) => {
        setNodes((nds) => {
            const node = nds.find((n) => n.id === id);
            if (!node) return nds;
            const clonedData = JSON.parse(JSON.stringify(node.data));
            const newNode = {
                ...node,
                id: crypto.randomUUID(),
                position: { x: node.position.x + 20, y: node.position.y + 20 },
                selected: true,
                data: clonedData
            };
            return [...nds.map(n => ({ ...n, selected: false })), newNode];
        });
    }, [setNodes]);

    const duplicateSelectedNodes = useCallback(() => {
        setNodes((nds) => {
            const selected = nds.filter(n => n.selected);
            if (selected.length === 0) return nds;

            const newNodes = selected.map(node => {
                const clonedData = JSON.parse(JSON.stringify(node.data));
                return {
                    ...node,
                    id: crypto.randomUUID(),
                    position: { x: node.position.x + 20, y: node.position.y + 20 },
                    selected: true,
                    data: clonedData
                };
            });

            // Return old nodes (deselected) + new nodes (selected)
            return [
                ...nds.map(n => ({ ...n, selected: false })),
                ...newNodes
            ];
        });
    }, [setNodes]);

    const handleDeleteNode = useCallback((id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    }, [setNodes, setEdges]);

    return {
        nodes, setNodes, onNodesChange,
        edges, setEdges, onEdgesChange,
        handleNodeUpdate,
        handleDuplicateNode,
        duplicateSelectedNodes, // Expose
        handleDeleteNode,
        viewPath, setViewPath,
        masterGraph, setMasterGraph
    };
};
