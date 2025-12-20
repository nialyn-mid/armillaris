import { useCallback, useState } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';
import { useData } from '../../../context/DataContext';

export const useSpecGraphState = () => {
    const { setIsSpecDirty, setBehaviorGraph } = useData();
    const [nodes, setNodes, _onNodesChange] = useNodesState([]);
    const [edges, setEdges, _onEdgesChange] = useEdgesState([]);
    const [masterGraph, _setMasterGraph] = useState<any>(null);

    const setMasterGraph = useCallback((graph: any) => {
        _setMasterGraph(graph);
        setBehaviorGraph(graph);
    }, [setBehaviorGraph]);

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

    const onNodesChange = useCallback((changes: any) => {
        _onNodesChange(changes);
        // Only set dirty for structural changes, ignoring selection, auto-dimensions, and resets (navigation)
        // Position is handled by onNodeDragStop to avoid jumping to dirty state on pure clicks
        const isUserChange = changes.some((c: any) =>
            c.type === 'remove' ||
            c.type === 'add'
        );
        if (isUserChange) {
            setIsSpecDirty(true);
        }
    }, [_onNodesChange, setIsSpecDirty]);

    const onEdgesChange = useCallback((changes: any) => {
        _onEdgesChange(changes);
        const isUserChange = changes.some((c: any) =>
            c.type === 'remove' ||
            c.type === 'add'
        );
        if (isUserChange) {
            setIsSpecDirty(true);
        }
    }, [_onEdgesChange, setIsSpecDirty]);

    const handleNodeUpdate = useCallback((id: string, newValues: any) => {
        setIsSpecDirty(true);
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

    // Recursive ID regeneration helper
    const regenerateGraphIds = useCallback((graph: any): any => {
        if (!graph || !graph.nodes) return graph;

        const newGraph = { ...graph };
        const idMap = new Map<string, string>();

        // 1. Generate new IDs for all nodes
        newGraph.nodes = graph.nodes.map((node: any) => {
            const newId = crypto.randomUUID();
            idMap.set(node.id, newId);
            return {
                ...node,
                id: newId,
                selected: false
            };
        });

        // 2. Update edges to point to new IDs
        newGraph.edges = graph.edges.map((edge: any) => ({
            ...edge,
            id: crypto.randomUUID(),
            source: idMap.get(edge.source) || edge.source,
            target: idMap.get(edge.target) || edge.target
        }));

        // 3. Recurse for nested graphs (Groups within Groups)
        newGraph.nodes = newGraph.nodes.map((node: any) => {
            if (node.data && node.data.graph) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        graph: regenerateGraphIds(node.data.graph)
                    }
                };
            }
            return node;
        });

        return newGraph;
    }, []);

    const handleDuplicateNode = useCallback((id: string) => {
        setIsSpecDirty(true);
        setNodes((nds) => {
            const node = nds.find((n) => n.id === id);
            if (!node) return nds;

            const clonedData = JSON.parse(JSON.stringify(node.data));

            // Re-attach handlers that were stripped by JSON.stringify
            clonedData.onUpdate = node.data.onUpdate;
            clonedData.onDuplicate = node.data.onDuplicate;
            clonedData.onDelete = node.data.onDelete;
            clonedData.onEditGroup = node.data.onEditGroup;

            // If it's a group with a graph, regenerate internal IDs
            if (clonedData.graph) {
                clonedData.graph = regenerateGraphIds(clonedData.graph);
            }

            const newNode = {
                ...node,
                id: crypto.randomUUID(),
                position: { x: node.position.x + 20, y: node.position.y + 20 },
                selected: true,
                data: clonedData
            };
            return [...nds.map(n => ({ ...n, selected: false })), newNode];
        });
    }, [setNodes, regenerateGraphIds]);

    const duplicateSelectedNodes = useCallback(() => {
        setNodes((nds) => {
            const selected = nds.filter(n => n.selected);
            if (selected.length === 0) return nds;

            const newNodes = selected.map(node => {
                const clonedData = JSON.parse(JSON.stringify(node.data));

                // Re-attach handlers that were stripped by JSON.stringify
                clonedData.onUpdate = node.data.onUpdate;
                clonedData.onDuplicate = node.data.onDuplicate;
                clonedData.onDelete = node.data.onDelete;
                clonedData.onEditGroup = node.data.onEditGroup;

                // If it's a group with a graph, regenerate internal IDs
                if (clonedData.graph) {
                    clonedData.graph = regenerateGraphIds(clonedData.graph);
                }

                return {
                    ...node,
                    id: crypto.randomUUID(),
                    position: { x: node.position.x + 20, y: node.position.y + 20 },
                    selected: true,
                    data: clonedData
                };
            });

            setIsSpecDirty(true);
            return [
                ...nds.map(n => ({ ...n, selected: false })),
                ...newNodes
            ];
        });
    }, [setNodes, regenerateGraphIds, setIsSpecDirty]);

    const handleDeleteNode = useCallback((id: string) => {
        setIsSpecDirty(true);
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
