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
