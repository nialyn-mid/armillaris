import type { Node, Edge } from 'reactflow';

// Helper to traverse to the current group
export const getGraphAt = (spec: any, path: { id: string }[]) => {
    let current = spec;
    for (const p of path) {
        const node = current.nodes.find((n: any) => n.id === p.id);
        if (!node || !node.data.graph) return { nodes: [], edges: [] };
        current = node.data.graph;
    }
    return current;
};

// Helper to update the spec at the current path
export const updateSpecAt = (spec: any, path: { id: string }[], newGraph: { nodes: Node[], edges: Edge[] }) => {
    // Deep clone to avoid mutation issues
    const newSpec = JSON.parse(JSON.stringify(spec));
    let current = newSpec;

    // If root
    if (path.length === 0) {
        newSpec.nodes = newGraph.nodes;
        newSpec.edges = newGraph.edges;
        return newSpec;
    }

    // Traverse
    let containerNode: any = null;
    for (const p of path) {
        const node = current.nodes.find((n: any) => n.id === p.id);
        if (!node) return newSpec; // Path invalid?
        // Ensure graph obj exists
        if (!node.data.graph) node.data.graph = { nodes: [], edges: [] };

        containerNode = node;
        current = node.data.graph;
    }

    // Update Graph
    current.nodes = newGraph.nodes;
    current.edges = newGraph.edges;

    // Propagate Ports to Container Node
    if (containerNode) {
        // Find internal GroupInput/GroupOutput nodes
        const inputNodes = newGraph.nodes.filter(n => n.type === 'GroupInput');
        const outputNodes = newGraph.nodes.filter(n => n.type === 'GroupOutput');

        // Sync Inputs
        const allInputs = inputNodes.flatMap(n => n.data.ports || []);
        containerNode.data.inputs = allInputs;

        // Sync Outputs
        const allOutputs = outputNodes.flatMap(n => n.data.ports || []);
        containerNode.data.outputs = allOutputs;
    }

    return newSpec;
};

// Recursive ID regeneration helper
export const regenerateGraphIds = (graph: any): any => {
    if (!graph || !graph.nodes) return graph;
    const newGraph = { ...graph };
    const idMap = new Map<string, string>();

    newGraph.nodes = graph.nodes.map((node: any) => {
        const newId = crypto.randomUUID();
        idMap.set(node.id, newId);
        return { ...node, id: newId, selected: false };
    });

    newGraph.edges = graph.edges.map((edge: any) => ({
        ...edge,
        id: crypto.randomUUID(),
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target
    }));

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
};

// Comprehensive behavior decomposition
export const decomposeBehavior = (spec: any) => {
    const allNodes: any[] = [];
    const allEdges: any[] = [];

    // 1. Recursive Flattening
    function flatten(graph: any, prefix: string) {
        if (!graph || !graph.nodes) return;

        for (const node of graph.nodes) {
            const newId = prefix + node.id;
            // Record node with hierarchical ID
            allNodes.push({
                ...node,
                id: newId,
                data: { ...node.data }
            });

            // Recurse into nested graphs
            if (node.data?.graph) {
                flatten(node.data.graph, newId + ".");
            }
        }

        if (graph.edges) {
            for (const edge of graph.edges) {
                allEdges.push({
                    ...edge,
                    source: prefix + edge.source,
                    target: prefix + edge.target,
                });
            }
        }
    }

    flatten(spec, "");

    const isProxyType = (type?: string) => type === 'Group' || type === 'GroupInput' || type === 'GroupOutput';

    // 2. Functional Nodes only
    const functionalNodes = allNodes.filter(n => !isProxyType(n.type));

    // 3. Edge Synthesis (Segment Walking)
    const functionalEdges: any[] = [];

    for (const srcNode of functionalNodes) {
        // Find all outgoing edge segments from this functional node
        const segments = allEdges.filter(e => e.source === srcNode.id);

        for (const startSegment of segments) {
            const queue: { target: string, handle: string }[] = [{
                target: startSegment.target,
                handle: startSegment.targetHandle || 'default'
            }];
            const seen = new Set<string>();

            while (queue.length > 0) {
                const current = queue.shift()!;
                const targetNode = allNodes.find(n => n.id === current.target);
                if (!targetNode) continue;

                if (!isProxyType(targetNode.type)) {
                    // REACHED FUNCTIONAL NODE
                    functionalEdges.push({
                        id: `e-${srcNode.id}-${startSegment.sourceHandle}-${targetNode.id}-${current.handle}`,
                        source: srcNode.id,
                        sourceHandle: startSegment.sourceHandle || 'default',
                        target: targetNode.id,
                        targetHandle: current.handle
                    });
                } else {
                    // PROXY NODE - CONTINUE WALKING
                    const cacheKey = `${current.target}:${current.handle}`;
                    if (seen.has(cacheKey)) continue;
                    seen.add(cacheKey);

                    if (targetNode.type === 'Group') {
                        // Bridge INTO group: Group(handle) -> internal GroupInput(handle)
                        const internalGin = allNodes.find(n => n.id.startsWith(targetNode.id + ".") && n.type === 'GroupInput');
                        if (internalGin) {
                            const internalEdges = allEdges.filter(e => e.source === internalGin.id && e.sourceHandle === current.handle);
                            for (const next of internalEdges) {
                                queue.push({ target: next.target, handle: next.targetHandle || 'default' });
                            }
                        }
                    } else if (targetNode.type === 'GroupOutput') {
                        // Bridge THROUGH group: GroupOutput(handle) -> parent Group(handle)
                        const lastDot = targetNode.id.lastIndexOf('.');
                        if (lastDot !== -1) {
                            const parentId = targetNode.id.substring(0, lastDot);
                            const nextEdges = allEdges.filter(e => e.source === parentId && e.sourceHandle === current.handle);
                            for (const next of nextEdges) {
                                queue.push({ target: next.target, handle: next.targetHandle || 'default' });
                            }
                        }
                    } else if (targetNode.type === 'GroupInput') {
                        // Bridge ACROSS internal group level: GroupInput(handle) -> internal consumers
                        const nextEdges = allEdges.filter(e => e.source === targetNode.id && e.sourceHandle === current.handle);
                        for (const next of nextEdges) {
                            queue.push({ target: next.target, handle: next.targetHandle || 'default' });
                        }
                    }
                }
            }
        }
    }

    return {
        nodes: functionalNodes,
        edges: functionalEdges
    };
};
