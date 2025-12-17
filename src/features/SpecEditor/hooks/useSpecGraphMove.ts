
import { useCallback, useRef, useState } from 'react';
import { type Node, type Edge, useReactFlow, useUpdateNodeInternals } from 'reactflow';
import { GroupMoveService } from '../services/GroupMoveService';

interface UseSpecGraphMoveProps {
    nodes: Node[];
    edges: Edge[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    onMoveNodesUp: (nodesToMove: Node[]) => void;
}

export const useSpecGraphMove = ({ nodes, edges, setNodes, setEdges, onMoveNodesUp }: UseSpecGraphMoveProps) => {
    const [_dragTarget, setDragTarget] = useState<string | null>(null);
    const lastDragTarget = useRef<string | null>(null);
    const { screenToFlowPosition, getNodes } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();

    // Helper to update node data without excessive re-renders
    const setNodeDragTarget = useCallback((nodeId: string | null) => {
        if (lastDragTarget.current === nodeId) return;

        // Capture previous target synchronously
        const prevTargetId = lastDragTarget.current;
        lastDragTarget.current = nodeId;
        setDragTarget(nodeId);

        setNodes(nds => nds.map(n => {
            const isTarget = n.id === nodeId;
            const wasTarget = n.id === prevTargetId;

            if (isTarget && !n.data.isDragTarget) {
                return { ...n, data: { ...n.data, isDragTarget: true } };
            }
            if (wasTarget && n.data.isDragTarget) {
                return { ...n, data: { ...n.data, isDragTarget: false } };
            }
            return n;
        }));
    }, [setNodes]);

    const handleDrag = useCallback((event: React.MouseEvent, activeNodes: Node[], _debugLabel: string) => {
        // Use Mouse Position for tighter control than Node Intersection
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        /*
        console.log(`[MoveDebug] Drag Event (${_debugLabel}):`, {
            x: event.clientX, y: event.clientY,
            flowX: flowPos.x, flowY: flowPos.y,
            activeNodesCount: activeNodes.length
        });
        */

        // Use internal store nodes to get accurate dimensions (width/height or measured)
        const internalNodes = getNodes();

        // Find nodes under cursor
        const targetNode = internalNodes.find(n => {
            // Skip moving nodes
            if (activeNodes.find(an => an.id === n.id)) return false;

            // React Flow 11 uses 'measured' -> { width, height }
            // Fallback to n.width/n.height
            const measured = (n as any).measured;
            const w = measured?.width ?? n.width ?? 150;
            const h = measured?.height ?? n.height ?? 40;

            const isOver = (
                flowPos.x >= n.position.x &&
                flowPos.x <= n.position.x + w &&
                flowPos.y >= n.position.y &&
                flowPos.y <= n.position.y + h
            );
            return isOver;
        });

        if (targetNode) {
            if (targetNode.type === 'GroupInput' || targetNode.type === 'GroupOutput' || targetNode.type === 'Group') {
                if (lastDragTarget.current !== targetNode.id) {
                    console.log('[MoveDebug] New Drag Target Identified:', targetNode.id, targetNode.type);
                }
                setNodeDragTarget(targetNode.id);
                return;
            }
        }

        // Fallback or Clear
        setNodeDragTarget(null);
    }, [setNodeDragTarget, screenToFlowPosition, getNodes]);

    const onNodeDrag = useCallback((event: React.MouseEvent, _node: Node, activeNodes: Node[]) => {
        handleDrag(event, activeNodes, 'nodeDrag');
    }, [handleDrag]);

    const onSelectionDrag = useCallback((event: React.MouseEvent, activeNodes: Node[]) => {
        handleDrag(event, activeNodes, 'selectionDrag');
    }, [handleDrag]);

    const performMoveIntoGroup = useCallback((targetGroupId: string, nodesToMove: Node[]) => {

        const result = GroupMoveService.calculateMoveIntoGroup(nodes, edges, targetGroupId, nodesToMove);
        if (!result) return;

        const { updatedNodes, updatedEdges, updatedTargetNodeId } = result;

        // 1. Update Nodes FIRST
        setNodes(updatedNodes);

        // 2. Defer Edge Updates and Notify Internals
        setTimeout(() => {
            updateNodeInternals(updatedTargetNodeId);
            setEdges(updatedEdges);
        }, 0);

    }, [nodes, edges, setNodes, setEdges, updateNodeInternals]); // Use props directly for consistent view

    const performMoveUp = useCallback((nodesToMove: Node[]) => {
        onMoveNodesUp(nodesToMove);
        setNodeDragTarget(null);
    }, [onMoveNodesUp, setNodeDragTarget]);

    const onNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node, activeNodes: Node[]) => {
        const currentTarget = lastDragTarget.current;
        setNodeDragTarget(null);

        if (!currentTarget) return;

        // Use getNodes for latest state check if needed, but 'nodes' prop is bound
        // Just rely on ID
        const targetNode = nodes.find(n => n.id === currentTarget);
        if (!targetNode) return;

        if (targetNode.type === 'Group') {
            performMoveIntoGroup(targetNode.id, activeNodes);
        } else if (targetNode.type === 'GroupInput' || targetNode.type === 'GroupOutput') {
            performMoveUp(activeNodes);
        }
    }, [nodes, performMoveIntoGroup, performMoveUp, setNodeDragTarget]);

    // Also handle Selection Drag Stop? 
    // React Flow calls onNodeDragStop even for selections? No, onSelectionDragStop
    const onSelectionDragStop = useCallback((event: React.MouseEvent, activeNodes: Node[]) => {
        onNodeDragStop(event, activeNodes[0], activeNodes);
    }, [onNodeDragStop]);

    return { onNodeDrag, onNodeDragStop, onSelectionDrag, onSelectionDragStop };
};
