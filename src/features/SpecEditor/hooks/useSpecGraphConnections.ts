import { useCallback } from 'react';
import { addEdge, type Connection, type Edge, type Node } from 'reactflow';

interface UseSpecGraphConnectionsProps {
    edges: Edge[];
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    nodes: Node[];
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
}

import { inferTypeFromNode, inferInputTypeFromNode } from '../utils/specTypeInference';

export const useSpecGraphConnections = ({ setEdges, nodes, setNodes }: UseSpecGraphConnectionsProps) => {

    const onConnect = useCallback((params: Connection) => {
        let { source, target, sourceHandle, targetHandle } = params;
        if (!source || !target) return; // Ensure valid connection

        // Type Inference Helpers (Now using Utils)
        const inferType = (nodeId: string, handleId: string | null): string => {
            const node = nodes.find(n => n.id === nodeId);
            return inferTypeFromNode(node, handleId);
        };

        const inferInputType = (nodeId: string, handleId: string | null): string => {
            const node = nodes.find(n => n.id === nodeId);
            return inferInputTypeFromNode(node, handleId);
        }


        let finalSourceHandle = sourceHandle;
        let finalTargetHandle = targetHandle;
        let pendingNodeUpdates: Node[] = [];

        // Handle Magic Input Creation (Source is GroupInputNode)
        if (sourceHandle === '__create_input__') {
            const inputNode = nodes.find(n => n.id === source);
            if (inputNode && inputNode.type === 'GroupInput') {
                const portIndex = (inputNode.data.ports?.length || 0) + 1;
                const newPortId = `in_${Date.now()}`;
                const newPortLabel = `Input ${portIndex}`;

                // Backwards Inference: GroupInput -> Target
                // If connecting to a target with known type, adopt it.
                const inferredType = inferInputType(target, targetHandle);

                const newPort = { id: newPortId, label: newPortLabel, type: inferredType };
                const updatedNode = {
                    ...inputNode,
                    data: { ...inputNode.data, ports: [...(inputNode.data.ports || []), newPort] }
                };

                // We shouldn't depend on setNodes immediately if we reuse `nodes` array?
                // `nodes` is from closure.
                pendingNodeUpdates.push(updatedNode);
                finalSourceHandle = newPortId;
            }
        }

        // Handle Magic Output Creation (Target is GroupOutputNode)
        if (targetHandle === '__create_output__') {
            const outputNode = nodes.find(n => n.id === target);
            if (outputNode && outputNode.type === 'GroupOutput') {
                const portIndex = (outputNode.data.ports?.length || 0) + 1;
                const newPortId = `out_${Date.now()}`;
                const newPortLabel = `Output ${portIndex}`;

                // Forward Inference: Source -> GroupOutput
                const inferredType = inferType(source, finalSourceHandle);

                const newPort = { id: newPortId, label: newPortLabel, type: inferredType };
                const updatedNode = {
                    ...outputNode,
                    data: { ...outputNode.data, ports: [...(outputNode.data.ports || []), newPort] }
                };
                pendingNodeUpdates.push(updatedNode);
                finalTargetHandle = newPortId;
            }
        } else {
            // Connecting to EXISTING GroupOutput port?
            // We should update the type!
            const outputNode = nodes.find(n => n.id === target);
            if (outputNode && outputNode.type === 'GroupOutput' && finalTargetHandle) {
                const inferredType = inferType(source, finalSourceHandle);
                if (inferredType !== 'any') {
                    // Check if update needed
                    const portIndex = outputNode.data.ports?.findIndex((p: any) => p.id === finalTargetHandle);
                    if (portIndex >= 0 && outputNode.data.ports[portIndex].type !== inferredType) {
                        const newPorts = [...outputNode.data.ports];
                        newPorts[portIndex] = { ...newPorts[portIndex], type: inferredType };
                        const updatedNode = { ...outputNode, data: { ...outputNode.data, ports: newPorts } };

                        // Check if already in pendingUpdates (priority to magic creation?)
                        // Magic creation block handled it. This is 'else'.
                        pendingNodeUpdates.push(updatedNode);
                    }
                }
            }
        }

        // Apply Updates
        if (pendingNodeUpdates.length > 0) {
            setNodes(nds => nds.map(n => {
                const update = pendingNodeUpdates.find(u => u.id === n.id);
                return update || n;
            }));
        }

        const connection = { ...params, sourceHandle: finalSourceHandle, targetHandle: finalTargetHandle };
        setEdges((eds) => addEdge(connection, eds));
    }, [nodes, setNodes, setEdges]);

    return { onConnect };
};
