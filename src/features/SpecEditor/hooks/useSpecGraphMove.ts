
import { useCallback, useRef, useState } from 'react';
import { type Node, type Edge, useReactFlow, useUpdateNodeInternals } from 'reactflow';

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

    const onNodeDrag = useCallback((event: React.MouseEvent, _node: Node, activeNodes: Node[]) => {
        // Use Mouse Position for tighter control than Node Intersection
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        // Use internal store nodes to get accurate dimensions (width/height or measured)
        const internalNodes = getNodes();

        // Find nodes under cursor
        const targetNode = internalNodes.find(n => {
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

        // Debug Log
        if (targetNode) {
            // console.log('Hovering:', targetNode.id, targetNode.type, targetNode.data.isDragTarget);
        }

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
        if (lastDragTarget.current !== null) {
            console.log('[MoveDebug] Clearing Drag Target. Cursor at:', flowPos);
        }
        setNodeDragTarget(null);

    }, [setNodeDragTarget, screenToFlowPosition, getNodes]);

    const performMoveIntoGroup = useCallback((targetGroupId: string, nodesToMove: Node[]) => {
        console.log('[MoveDebug] performMoveIntoGroup START', targetGroupId);
        const targetNode = nodes.find(n => n.id === targetGroupId);
        if (!targetNode) return;

        const idsToMove = new Set(nodesToMove.map(n => n.id));

        // 1. Prepare Target Data
        const currentGraph = targetNode.data.graph || { nodes: [], edges: [] };
        const nextInternalNodes = [...currentGraph.nodes];
        const nextInternalEdges = [...currentGraph.edges];
        const nextInputs = [...(targetNode.data.inputs || [])];
        const nextOutputs = [...(targetNode.data.outputs || [])];

        // 2. Move Nodes & Transform Coords
        const movedNodes = nodesToMove.map(n => ({
            ...n,
            position: {
                x: n.position.x - targetNode.position.x,
                y: n.position.y - targetNode.position.y
            },
            selected: false,
            parentNode: undefined,
            data: { ...n.data, isDragTarget: false }
        }));
        nextInternalNodes.push(...movedNodes);

        // 3. Analyze Edges
        const connectedEdges = edges.filter(e =>
            (idsToMove.has(e.source) || idsToMove.has(e.target)) &&
            e.source !== targetGroupId && e.target !== targetGroupId
        );

        const newEdgesToAdd: Edge[] = [];
        const edgesToRemoveIds = new Set<string>();

        // A. Incoming (Outside -> Moved)
        const incomingEdges = connectedEdges.filter(e => !idsToMove.has(e.source) && idsToMove.has(e.target));
        const incomingGroups = new Map<string, Edge[]>(); // Key: sourceId::sourceHandle

        incomingEdges.forEach(e => {
            const key = `${e.source}::${e.sourceHandle || 'default'}`;
            if (!incomingGroups.has(key)) incomingGroups.set(key, []);
            incomingGroups.get(key)?.push(e);
        });

        incomingGroups.forEach((groupEdges, _key) => {
            const sample = groupEdges[0];

            // Infer Type from Target Node Port
            let typeToUse = 'any';
            const movedTargetNode = nodesToMove.find(n => n.id === sample.target);
            if (movedTargetNode) {
                // Check 'data.def.inputs' first (Standard Definition)
                if (Array.isArray(movedTargetNode.data.def?.inputs)) {
                    const defPort = movedTargetNode.data.def.inputs.find((p: any) => p.id === sample.targetHandle);
                    if (defPort && defPort.type) typeToUse = defPort.type;
                }
                // Check Element-wise Definition (e.g. Expandable Inputs)
                else if (movedTargetNode.data.def?.inputs?.$item?.type) {
                    typeToUse = movedTargetNode.data.def.inputs.$item.type;
                }

                // Fallback to 'data.inputs' if type is still any
                if (typeToUse === 'any' && Array.isArray(movedTargetNode.data.inputs)) {
                    const port = movedTargetNode.data.inputs.find((p: any) => p.id === sample.targetHandle);
                    if (port) typeToUse = port.type || 'any';
                }
            } else {
                console.log('[MoveDebug] MovedTargetNode NOT FOUND for:', sample.target);
            }

            // ALWAYS create new port for this unique connection group.
            // Do NOT reuse existing edges/ports unless they match this EXACT group (which they won't, effectively)
            // Actually, if we are moving B into Group G, and A->G->B already exists? 
            // The "move" operation assumes B is currently OUTSIDE and connected to A.
            // If A->G->B exists, B is INSIDE. 
            // So this case (Moving B into G) implies B is NOT inside.
            // Thus, we should always create a NEW port on G to represent A->B connection passing through G.

            const portId = crypto.randomUUID();
            const nodeLabel = `In: ${sample.sourceHandle || 'Port'}`;
            nextInputs.push({ id: portId, label: 'Input', type: typeToUse });

            let groupInputId: string;
            const anyGroupInput = nextInternalNodes.find(n => n.type === 'GroupInput');

            if (anyGroupInput) {
                groupInputId = anyGroupInput.id;
                anyGroupInput.data = {
                    ...anyGroupInput.data,
                    ports: [...(anyGroupInput.data.ports || []), { id: portId, label: nodeLabel, type: typeToUse }]
                };
            } else {
                groupInputId = crypto.randomUUID();
                nextInternalNodes.push({
                    id: groupInputId,
                    type: 'GroupInput',
                    position: { x: sample.sourceHandle ? -150 : 0, y: 0 },
                    data: { ports: [{ id: portId, label: nodeLabel, type: typeToUse }] }
                });
            }

            // Create Edge: A -> Group Port
            newEdgesToAdd.push({
                id: crypto.randomUUID(),
                source: sample.source,
                sourceHandle: sample.sourceHandle,
                target: targetGroupId,
                targetHandle: portId,
                type: sample.type
            });

            // Create Internal Edge: Group Input -> B
            groupEdges.forEach(oldEdge => {
                nextInternalEdges.push({
                    id: crypto.randomUUID(),
                    source: groupInputId,
                    sourceHandle: portId,
                    target: oldEdge.target,
                    targetHandle: oldEdge.targetHandle,
                    type: oldEdge.type // Preserve type
                });
                edgesToRemoveIds.add(oldEdge.id);
            });
        });

        // B. Outgoing (Moved -> Outside)
        const outgoingEdges = connectedEdges.filter(e => idsToMove.has(e.source) && !idsToMove.has(e.target));
        const outgoingGroups = new Map<string, Edge[]>(); // Key: sourceId::sourceHandle
        outgoingEdges.forEach(e => {
            const key = `${e.source}::${e.sourceHandle || 'default'}`;
            if (!outgoingGroups.has(key)) outgoingGroups.set(key, []);
            outgoingGroups.get(key)?.push(e);
        });

        outgoingGroups.forEach((groupEdges, _key) => {
            const sample = groupEdges[0];

            // Infer Type from Source Node Port
            let typeToUse = 'any';
            const movedSourceNode = nodesToMove.find(n => n.id === sample.source);
            if (movedSourceNode) {
                // Check 'data.def.outputs' first
                if (Array.isArray(movedSourceNode.data.def?.outputs)) {
                    const defPort = movedSourceNode.data.def.outputs.find((p: any) => p.id === sample.sourceHandle);
                    if (defPort && defPort.type) typeToUse = defPort.type;
                }

                // Fallback
                if (typeToUse === 'any' && Array.isArray(movedSourceNode.data.outputs)) {
                    const port = movedSourceNode.data.outputs.find((p: any) => p.id === sample.sourceHandle);
                    if (port) typeToUse = port.type || 'any';
                }
            }

            const portId = crypto.randomUUID();
            nextOutputs.push({ id: portId, label: 'Output', type: typeToUse });

            const anyGroupOutput = nextInternalNodes.find(n => n.type === 'GroupOutput');
            let groupOutputId: string;

            if (anyGroupOutput) {
                groupOutputId = anyGroupOutput.id;
                anyGroupOutput.data = {
                    ...anyGroupOutput.data,
                    ports: [...(anyGroupOutput.data.ports || []), { id: portId, label: 'Out', type: typeToUse }]
                };
            } else {
                groupOutputId = crypto.randomUUID();
                nextInternalNodes.push({
                    id: groupOutputId,
                    type: 'GroupOutput',
                    position: { x: 300, y: 0 },
                    data: { ports: [{ id: portId, label: 'Out', type: typeToUse }] }
                });
            }

            nextInternalEdges.push({
                id: crypto.randomUUID(),
                source: sample.source,
                sourceHandle: sample.sourceHandle,
                target: groupOutputId,
                targetHandle: portId
            });

            groupEdges.forEach(oldEdge => {
                newEdgesToAdd.push({
                    id: crypto.randomUUID(),
                    source: targetGroupId,
                    sourceHandle: portId,
                    target: oldEdge.target,
                    targetHandle: oldEdge.targetHandle,
                    type: oldEdge.type
                });
                edgesToRemoveIds.add(oldEdge.id);
            });
        });

        // C. Internal Edges
        const pureInternalEdges = connectedEdges.filter(e => idsToMove.has(e.source) && idsToMove.has(e.target));
        nextInternalEdges.push(...pureInternalEdges);
        pureInternalEdges.forEach(e => edgesToRemoveIds.add(e.id));


        // Final Updates
        const updatedTarget = {
            ...targetNode,
            data: {
                ...targetNode.data,
                graph: { nodes: nextInternalNodes, edges: nextInternalEdges },
                inputs: nextInputs,
                outputs: nextOutputs,
                isDragTarget: false
            }
        };

        // 1. Update Nodes FIRST
        setNodes(currNodes => currNodes.map(n => {
            if (n.id === targetGroupId) return updatedTarget;
            if (idsToMove.has(n.id)) return undefined;
            return n;
        }).filter(Boolean) as Node[]);

        // 2. Defer Edge Updates to allow Handles to mount
        // AND trigger updateNodeInternals to notify ReactFlow about new handles
        setTimeout(() => {
            updateNodeInternals(targetGroupId);
            setEdges(currEdges => {
                const temp = currEdges.filter(e => !edgesToRemoveIds.has(e.id));
                return [...temp, ...newEdgesToAdd];
            });
        }, 0);

    }, [nodes, edges, setNodes, setEdges]); // Use props directly for consistent view

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

    return { onNodeDrag, onNodeDragStop };
};
