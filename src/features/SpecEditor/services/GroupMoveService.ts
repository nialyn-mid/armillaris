import type { Node, Edge } from 'reactflow';
import { getGraphAt, updateSpecAt } from '../utils/specTraversals';
import { inferInputTypeFromNode, inferTypeFromNode } from '../utils/specTypeInference';

export class GroupMoveService {
    /**
     * Calculates the new graph state when moving nodes INTO a group node.
     * Handles coordinate transformation, edge rewriting, and port creation.
     */
    static calculateMoveIntoGroup(
        nodes: Node[],
        edges: Edge[],
        targetGroupId: string,
        nodesToMove: Node[]
    ) {
        const targetNode = nodes.find(n => n.id === targetGroupId);
        if (!targetNode) return null;

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
            // Group by Source + Target to ensure distinct ports for distinct connections
            const key = `${e.source}::${e.sourceHandle || 'default'}::${e.target}::${e.targetHandle || 'default'}`;
            if (!incomingGroups.has(key)) incomingGroups.set(key, []);
            incomingGroups.get(key)?.push(e);
        });

        incomingGroups.forEach((groupEdges, _key) => {
            const sample = groupEdges[0];

            // Infer Type from Target Node Port
            const movedTargetNode = nodesToMove.find(n => n.id === sample.target);
            const typeToUse = inferInputTypeFromNode(movedTargetNode, (sample.targetHandle || null) as string | null);

            const portId = crypto.randomUUID();
            // Label now includes Target info to differentiate
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
                    type: oldEdge.type
                });
                edgesToRemoveIds.add(oldEdge.id);
            });
        });

        // B. Outgoing (Moved -> Outside)
        const outgoingEdges = connectedEdges.filter(e => idsToMove.has(e.source) && !idsToMove.has(e.target));
        const outgoingGroups = new Map<string, Edge[]>();
        outgoingEdges.forEach(e => {
            const key = `${e.source}::${e.sourceHandle || 'default'}`;
            if (!outgoingGroups.has(key)) outgoingGroups.set(key, []);
            outgoingGroups.get(key)?.push(e);
        });

        outgoingGroups.forEach((groupEdges, _key) => {
            const sample = groupEdges[0];

            // Infer Type from Source Node Port
            const movedSourceNode = nodesToMove.find(n => n.id === sample.source);
            const typeToUse = inferTypeFromNode(movedSourceNode, (sample.sourceHandle || null) as string | null);

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

        const updatedNodes = nodes.map(n => {
            if (n.id === targetGroupId) return updatedTarget;
            if (idsToMove.has(n.id)) return undefined;
            return n;
        }).filter(Boolean) as Node[];

        const updatedEdges = [
            ...edges.filter(e => !edgesToRemoveIds.has(e.id)),
            ...newEdgesToAdd
        ];

        return {
            updatedNodes,
            updatedEdges,
            updatedTargetNodeId: targetGroupId
        };
    }

    /**
     * Calculates the new graph state when moving nodes OUT of the current group (Up to parent).
     */
    static calculateMoveUp(
        masterGraph: any,
        viewPath: { id: string }[],
        currentNodes: Node[],
        currentEdges: Edge[],
        nodesToMove: Node[]
    ) {
        const idsToMove = new Set(nodesToMove.map(n => n.id));

        // 1. Classify Edges relative to the set of moving nodes
        const internalEdges: Edge[] = [];
        const crossingOutEdges: Edge[] = []; // Moving -> Staying
        const crossingInEdges: Edge[] = []; // Staying -> Moving
        const remainingEdges: Edge[] = [];

        currentEdges.forEach(e => {
            const srcMoved = idsToMove.has(e.source);
            const tgtMoved = idsToMove.has(e.target);

            if (srcMoved && tgtMoved) {
                internalEdges.push(e);
            } else if (srcMoved && !tgtMoved) {
                crossingOutEdges.push(e);
            } else if (!srcMoved && tgtMoved) {
                crossingInEdges.push(e);
            } else {
                remainingEdges.push(e);
            }
        });

        // 2. Prepare Child Updates (Remaining Nodes + New Ports/Edges)
        let nextRemainingNodes = currentNodes.filter(n => !idsToMove.has(n.id));
        let nextRemainingEdges = [...remainingEdges];

        // 3. Prepare Parent Updates
        const parentPath = viewPath.slice(0, -1);
        let updatedSpec = JSON.parse(JSON.stringify(masterGraph));

        const parentGraph = getGraphAt(updatedSpec, parentPath);
        const currentGroupNodeId = viewPath[viewPath.length - 1].id;
        const currentGroupNode = parentGraph.nodes.find((n: any) => n.id === currentGroupNodeId);

        if (!currentGroupNode) return null;

        const offsetX = currentGroupNode.position.x;
        const offsetY = currentGroupNode.position.y;

        // Transform Moved Nodes
        const movedNodesInParent = nodesToMove.map(n => ({
            ...n,
            position: {
                x: n.position.x + offsetX + 50,
                y: n.position.y + offsetY + 50
            },
            selected: true,
            parentNode: undefined,
            data: { ...n.data, isDragTarget: false }
        }));

        // New Parent Elements
        const nextParentNodes = [...parentGraph.nodes, ...movedNodesInParent];
        const nextParentEdges = [...parentGraph.edges, ...internalEdges];

        // 4. Handle Crossing Out (Moving -> Staying)
        crossingOutEdges.forEach(edge => {
            const portId = crypto.randomUUID();
            const nodeLabel = `In: ${edge.targetHandle || 'Port'}`;

            // A. Update Parent: Add Input Port to Group Node
            if (!currentGroupNode.data.inputs) currentGroupNode.data.inputs = [];
            currentGroupNode.data.inputs.push({ id: portId, label: 'Input', type: 'any' });

            // Add Edge in Parent: Source(Moving, now in Parent) -> GroupNode
            nextParentEdges.push({
                id: crypto.randomUUID(),
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: currentGroupNodeId,
                targetHandle: portId,
                type: edge.type
            });

            // B. Update Child: Add GroupInput Node + Edge
            let groupInput = nextRemainingNodes.find(n => n.type === 'GroupInput');
            let groupInputId: string;

            if (groupInput) {
                groupInputId = groupInput.id;
                groupInput.data = {
                    ...groupInput.data,
                    ports: [...(groupInput.data.ports || []), { id: portId, label: nodeLabel, type: 'any' }]
                };
            } else {
                groupInputId = crypto.randomUUID();
                nextRemainingNodes.push({
                    id: groupInputId,
                    type: 'GroupInput',
                    position: { x: -150, y: 0 },
                    data: { ports: [{ id: portId, label: nodeLabel, type: 'any' }] }
                });
            }

            // Edge in Child: GroupInput -> Target(Staying)
            nextRemainingEdges.push({
                id: crypto.randomUUID(),
                source: groupInputId,
                sourceHandle: portId,
                target: edge.target,
                targetHandle: edge.targetHandle,
                type: edge.type
            });
        });

        // 5. Handle Crossing In (Staying -> Moving)
        crossingInEdges.forEach(edge => {
            const portId = crypto.randomUUID();

            // A. Update Parent: Add Output Port to Group Node
            if (!currentGroupNode.data.outputs) currentGroupNode.data.outputs = [];
            currentGroupNode.data.outputs.push({ id: portId, label: 'Output', type: 'any' });

            // Add Edge in Parent: GroupNode -> Target(Moving, now in Parent)
            nextParentEdges.push({
                id: crypto.randomUUID(),
                source: currentGroupNodeId,
                sourceHandle: portId,
                target: edge.target,
                targetHandle: edge.targetHandle,
                type: edge.type
            });

            // B. Update Child: Add GroupOutput Node + Edge
            let groupOutput = nextRemainingNodes.find(n => n.type === 'GroupOutput');
            let groupOutputId: string;

            if (groupOutput) {
                groupOutputId = groupOutput.id;
                groupOutput.data = {
                    ...groupOutput.data,
                    ports: [...(groupOutput.data.ports || []), { id: portId, label: 'Out', type: 'any' }]
                };
            } else {
                groupOutputId = crypto.randomUUID();
                nextRemainingNodes.push({
                    id: groupOutputId,
                    type: 'GroupOutput',
                    position: { x: 300, y: 0 },
                    data: { ports: [{ id: portId, label: 'Out', type: 'any' }] }
                });
            }

            // Edge in Child: Source(Staying) -> GroupOutput
            nextRemainingEdges.push({
                id: crypto.randomUUID(),
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: groupOutputId,
                targetHandle: portId,
                type: edge.type
            });
        });

        // 6. Commit Updates using updateSpecAt for Parent

        // We need to inject the Updated Child Graph into the Parent's Group Node
        currentGroupNode.data.graph = { nodes: nextRemainingNodes, edges: nextRemainingEdges };

        // Now update the spec to reflect the changes in the PARENT graph
        updatedSpec = updateSpecAt(updatedSpec, parentPath, { nodes: nextParentNodes, edges: nextParentEdges });

        return {
            updatedSpec,
            remainingNodes: nextRemainingNodes,
            remainingEdges: nextRemainingEdges
        };
    }
}
