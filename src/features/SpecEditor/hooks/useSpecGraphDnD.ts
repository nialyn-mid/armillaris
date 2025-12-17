import { useCallback, useState, useRef } from 'react';
import type { Node, ReactFlowInstance } from 'reactflow';
import type { EngineSpec, EngineSpecNodeDef } from '../../../lib/engine-spec-types';

interface UseSpecGraphDnDProps {
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    engineSpec: EngineSpec | null;
    handleNodeUpdate: (id: string, newValues: any) => void;
    handleDuplicateNode: (id: string) => void;
    handleDeleteNode: (id: string) => void;
    onEditGroup: (id: string, label: string) => void;
}

export const useSpecGraphDnD = ({
    setNodes,
    engineSpec,
    handleNodeUpdate,
    handleDuplicateNode,
    handleDeleteNode,
    onEditGroup
}: UseSpecGraphDnDProps) => {
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    const onDragStart = (event: React.DragEvent, nodeDef: EngineSpecNodeDef, customData?: any) => {
        if (customData) {
            event.dataTransfer.setData('application/reactflow/custom', JSON.stringify(customData));
        } else {
            event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeDef));
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    // Recursive ID regeneration helper (Duplicated here or should be shared? Shared if possible, but localized is safer for now)
    const regenerateGraphIds = useCallback((graph: any): any => {
        if (!graph || !graph.nodes) return graph;
        const newGraph = { ...graph };
        const idMap = new Map<string, string>();

        // 1. New IDs
        newGraph.nodes = graph.nodes.map((node: any) => {
            const newId = crypto.randomUUID();
            idMap.set(node.id, newId);
            return { ...node, id: newId, selected: false };
        });

        // 2. Edges
        newGraph.edges = graph.edges.map((edge: any) => ({
            ...edge,
            id: crypto.randomUUID(),
            source: idMap.get(edge.source) || edge.source,
            target: idMap.get(edge.target) || edge.target
        }));

        // 3. Recurse
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

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) return;
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            // 1. Handle Custom Node Drop
            const customDataStr = event.dataTransfer.getData('application/reactflow/custom');
            if (customDataStr) {
                const customData = JSON.parse(customDataStr);
                // "customData" is the full "data" object of the node.
                // We need to regenerate IDs because it's a new instance.
                const newData = JSON.parse(JSON.stringify(customData)); // Deep clone

                if (newData.graph) {
                    newData.graph = regenerateGraphIds(newData.graph);
                }

                const newNode: Node = {
                    id: crypto.randomUUID(),
                    type: customData.def.type || 'Group', // Default to Group if type missing, but it should be there
                    position,
                    style: { width: 220, height: 100, ...customData.style }, // Preserve style?
                    data: {
                        ...newData,
                        onUpdate: handleNodeUpdate,
                        onDuplicate: handleDuplicateNode,
                        onDelete: handleDeleteNode,
                        onEditGroup: onEditGroup
                    }
                };
                setNodes((nds) => nds.concat(newNode));
                return;
            }

            // 2. Handle Standard Node Drop
            const typeData = event.dataTransfer.getData('application/reactflow');
            if (!typeData) return;

            const nodeDef: EngineSpecNodeDef = JSON.parse(typeData);

            // Handle Group Node (Drill-Down Architecture)
            if (nodeDef.type === 'Group') {
                const groupId = crypto.randomUUID();
                const groupNode: Node = {
                    id: groupId,
                    type: 'Group',
                    position,
                    // Standard Size
                    style: { width: 220, height: 100 },
                    data: {
                        label: 'New Group',
                        def: nodeDef,
                        values: {},
                        inputs: [],
                        outputs: [],
                        onUpdate: handleNodeUpdate,
                        onEditGroup: onEditGroup,
                        // Initialize internal graph? 
                        // It will be lazily created by 'onEditGroup' navigation if missing,
                        // or we can init it here.
                        graph: {
                            nodes: [
                                { id: 'start', type: 'GroupInput', position: { x: 50, y: 150 }, data: { label: 'Input', ports: [] } },
                                { id: 'end', type: 'GroupOutput', position: { x: 450, y: 150 }, data: { label: 'Output', ports: [] } }
                            ],
                            edges: []
                        }
                    }
                };
                setNodes((nds) => nds.concat(groupNode));
                return;
            }

            // Handle Group Input/Output Nodes
            if (nodeDef.type === 'GroupInput' || nodeDef.type === 'GroupOutput') {
                const isInput = nodeDef.type === 'GroupInput';
                const newNode: Node = {
                    id: crypto.randomUUID(),
                    type: nodeDef.type,
                    position,
                    data: {
                        label: isInput ? 'Group Input' : 'Group Output',
                        ports: [],
                        onUpdate: handleNodeUpdate,
                        onDuplicate: handleDuplicateNode,
                        onDelete: handleDeleteNode
                    }
                };
                setNodes((nds) => nds.concat(newNode));
                return;
            }

            // Normal Node
            const categoryColor = engineSpec?.categories?.[nodeDef.category]?.color;
            const newNode: Node = {
                id: crypto.randomUUID(),
                type: 'custom',
                position,
                data: {
                    label: nodeDef.label,
                    def: nodeDef,
                    categoryColor,
                    values: {},
                    onUpdate: handleNodeUpdate,
                    onDuplicate: handleDuplicateNode,
                    onDelete: handleDeleteNode
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes, handleNodeUpdate, engineSpec, handleDuplicateNode, handleDeleteNode, onEditGroup, regenerateGraphIds]
    );

    const onNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node, _nodes: Node[]) => {
        // No auto-parenting needed for Nested Graphs
    }, []);

    return {
        onDragStart,
        onDrop,
        onNodeDragStop,
        reactFlowWrapper,
        setReactFlowInstance
    };
};
