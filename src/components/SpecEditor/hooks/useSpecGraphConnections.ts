import { useCallback } from 'react';
import { addEdge, type Connection, type Edge, type Node } from 'reactflow';

interface UseSpecGraphConnectionsProps {
    edges: Edge[];
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    nodes: Node[];
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
}

export const useSpecGraphConnections = ({ setEdges, nodes, setNodes }: UseSpecGraphConnectionsProps) => {

    const onConnect = useCallback((params: Connection) => {
        let { source, target, sourceHandle, targetHandle } = params;

        // Handle Magic Input Creation (Source is GroupInputNode)
        if (sourceHandle === '__create_input__') {
            const inputNode = nodes.find(n => n.id === source);
            if (inputNode && inputNode.type === 'GroupInput') {
                // Generate new Port ID
                const portIndex = (inputNode.data.ports?.length || 0) + 1;
                const newPortId = `in_${Date.now()}`; // Unique ID
                const newPortLabel = `Input ${portIndex}`;

                // Update Node Data
                const newPort = { id: newPortId, label: newPortLabel, type: 'any' };
                const updatedNode = {
                    ...inputNode,
                    data: {
                        ...inputNode.data,
                        ports: [...(inputNode.data.ports || []), newPort]
                    }
                };

                setNodes(nds => nds.map(n => n.id === source ? updatedNode : n));

                // Use the new handle for the edge
                sourceHandle = newPortId;
            }
        }

        // Handle Magic Output Creation (Target is GroupOutputNode)
        if (targetHandle === '__create_output__') {
            const outputNode = nodes.find(n => n.id === target);
            if (outputNode && outputNode.type === 'GroupOutput') {
                // Generate new Port ID
                const portIndex = (outputNode.data.ports?.length || 0) + 1;
                const newPortId = `out_${Date.now()}`;
                const newPortLabel = `Output ${portIndex}`;

                const newPort = { id: newPortId, label: newPortLabel, type: 'any' };
                const updatedNode = {
                    ...outputNode,
                    data: {
                        ...outputNode.data,
                        ports: [...(outputNode.data.ports || []), newPort]
                    }
                };

                setNodes(nds => nds.map(n => n.id === target ? updatedNode : n));

                // Use the new handle
                targetHandle = newPortId;
            }
        }

        // Create the edge with (possibly updated) handles
        const connection = { ...params, sourceHandle, targetHandle };

        // Use LabeledEdge by default or based on logic?
        // Default to simple edge for now, or 'labeled' if we want.
        // SpecNodeEditor uses `edgeTypes={{ labeled: LabeledEdge }}`.
        // But `addEdge` creates standard edge unless properties are set.
        // Let's set type='labeled' if we want labels? Or standard.
        // Stick to standard "default" connection for now, can enhance later.

        setEdges((eds) => addEdge(connection, eds));
    }, [nodes, setNodes, setEdges]);

    return { onConnect };
};
