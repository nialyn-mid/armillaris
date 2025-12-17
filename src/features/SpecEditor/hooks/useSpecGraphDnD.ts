import { useCallback, useState, useRef } from 'react';
import { type Node, useReactFlow } from 'reactflow';
import type { EngineSpec, EngineSpecNodeDef } from '../../../lib/engine-spec-types';
import { regenerateGraphIds } from '../utils/specTraversals';

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

    // We don't strictly need reactFlowInstance for positioning anymore with screenToFlowPosition, 
    // but onDrop uses it to check existence.
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { screenToFlowPosition } = useReactFlow();

    const onDragStart = (event: React.DragEvent, nodeDef: EngineSpecNodeDef, customData?: any) => {
        if (customData) {
            event.dataTransfer.setData('application/reactflow/custom', JSON.stringify(customData));
        } else {
            event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeDef));
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) return;

            // Use screenToFlowPosition for accurate drop location
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // 1. Handle Custom Node Drop
            const customDataStr = event.dataTransfer.getData('application/reactflow/custom');
            if (customDataStr) {
                const customData = JSON.parse(customDataStr);
                const newData = JSON.parse(JSON.stringify(customData));

                if (newData.graph) {
                    newData.graph = regenerateGraphIds(newData.graph);
                }

                const newNode: Node = {
                    id: crypto.randomUUID(),
                    type: customData.def.type || 'Group',
                    position,
                    data: {
                        ...newData, // Use the regenerated data
                        isDragTarget: false,
                        def: customData.def, // Keep ref to def
                        onUpdate: handleNodeUpdate,
                        onDuplicate: handleDuplicateNode,
                        onDelete: handleDeleteNode,
                        onEditGroup: onEditGroup
                    },
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
                    style: { width: 220, height: 100 },
                    data: {
                        label: 'New Group',
                        def: nodeDef,
                        values: {},
                        inputs: [],
                        outputs: [],
                        onUpdate: handleNodeUpdate,
                        onEditGroup: onEditGroup,
                        onDuplicate: handleDuplicateNode,
                        onDelete: handleDeleteNode,
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
        [reactFlowInstance, setNodes, handleNodeUpdate, engineSpec, handleDuplicateNode, handleDeleteNode, onEditGroup, screenToFlowPosition]
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
