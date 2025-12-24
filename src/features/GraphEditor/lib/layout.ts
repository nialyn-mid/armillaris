import { type Node, type Edge } from 'reactflow';
import dagre from 'dagre';

export const nodeWidth = 172;
export const nodeHeight = 48;

/**
 * Standard Dagre layout for a set of nodes and edges.
 */
export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) return { nodes, edges };

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 30, nodesep: 10 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const n = dagreGraph.node(node.id);
        node.targetPosition = 'left' as any;
        node.sourcePosition = 'right' as any;
        node.position = {
            x: n.x - nodeWidth / 2,
            y: n.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};

export const getGridLayout = (nodes: Node[]) => {
    const spacingX = 200;
    const spacingY = 80;
    const cols = Math.ceil(Math.sqrt(nodes.length));

    return nodes.map((node, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        return {
            ...node,
            position: {
                x: col * spacingX,
                y: row * spacingY
            }
        };
    });
};

/**
 * Force-Directed Layout: Organic, compact, and balanced.
 * Performs a one-shot simulation in memory.
 */
export const getForceDirectedLayout = (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) return nodes;

    // 1. Isolation & Connectivity
    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
        if (adj.has(e.source) && adj.has(e.target)) {
            adj.get(e.source)!.push(e.target);
            adj.get(e.target)!.push(e.source);
        }
    });

    const isLinked = (id: string) => adj.get(id)!.length > 0;
    const linkedNodes = nodes.filter(n => isLinked(n.id));
    const unlinkedNodes = nodes.filter(n => !isLinked(n.id));

    const visited = new Set<string>();
    const components: string[][] = [];
    linkedNodes.forEach(node => {
        if (!visited.has(node.id)) {
            const comp: string[] = [];
            const queue = [node.id];
            visited.add(node.id);
            while (queue.length > 0) {
                const u = queue.shift()!;
                comp.push(u);
                adj.get(u)!.forEach(v => {
                    if (!visited.has(v)) {
                        visited.add(v);
                        queue.push(v);
                    }
                });
            }
            components.push(comp);
        }
    });

    // Establish the macro-structure of the connected components
    const radius = Math.sqrt(linkedNodes.length || 1) * 390 + 3500;
    const simNodes = linkedNodes.map((n, i) => {
        const angle = (i / (linkedNodes.length || 1)) * 2 * Math.PI;
        return {
            id: n.id,
            x: Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
            y: Math.sin(angle) * radius + (Math.random() - 0.5) * 100,
            vx: 0,
            vy: 0
        };
    });

    const nodeIndices = new Map(simNodes.map((n, i) => [n.id, i]));
    const simEdges = edges
        .filter(e => nodeIndices.has(e.source) && nodeIndices.has(e.target))
        .map(e => ({ source: nodeIndices.get(e.source)!, target: nodeIndices.get(e.target)! }));

    const componentNodeIndices = components.map(ids => ids.map(id => nodeIndices.get(id)!));
    const getCentroid = (indices: number[]) => {
        let sx = 0, sy = 0;
        indices.forEach(idx => {
            sx += simNodes[idx].x;
            sy += simNodes[idx].y;
        });
        return { x: sx / indices.length, y: sy / indices.length };
    };

    let temperature = 4.0;
    for (let it = 0; it < 100; it++) {
        // Stronger Attraction
        simEdges.forEach(e => {
            const nA = simNodes[e.source];
            const nB = simNodes[e.target];
            const dx = nB.x - nA.x;
            const dy = nB.y - nA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            const force = dist * 0.25; // Increased from 0.1
            nA.vx += (dx / dist) * force;
            nA.vy += (dy / dist) * force;
            nB.vx -= (dx / dist) * force;
            nB.vy -= (dy / dist) * force;
        });

        componentNodeIndices.forEach(indices => {
            const centroid = getCentroid(indices);
            indices.forEach(idx => {
                const n = simNodes[idx];
                n.vx -= n.x * 0.1; // Reduced from 0.15
                n.vy -= n.y * 0.1;
                if (indices.length > 1) {
                    n.vx += (centroid.x - n.x) * 0.05; // Cluster cohesion
                    n.vy += (centroid.y - n.y) * 0.05;
                }
            });
        });

        simNodes.forEach(n => {
            const vMod = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
            if (vMod > 0) {
                const cappedV = Math.min(vMod, temperature * 50);
                n.x += (n.vx / vMod) * cappedV;
                n.y += (n.vy / vMod) * cappedV;
            }
            n.vx *= 0.3;
            n.vy *= 0.3;
        });
        temperature *= 0.96;
    }

    // 3. Square Snapping & Spacing
    const spacingX = 220; // 172 width + margin
    const spacingY = 160; // Increased for top/bottom ports
    const grid = new Map<string, string>(); // "x,y" -> nodeId

    const cartesianToSquare = (x: number, y: number) => {
        return {
            qx: Math.round(x / spacingX),
            qy: Math.round(y / spacingY)
        };
    };

    const squareToCartesian = (qx: number, qy: number) => {
        return {
            x: qx * spacingX,
            y: qy * spacingY
        };
    };

    const findNearestFree = (targetQX: number, targetQY: number) => {
        let radius = 0;
        while (radius < 100) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const qx = targetQX + dx;
                    const qy = targetQY + dy;
                    if (!grid.has(`${qx},${qy}`)) return { qx, qy };
                }
            }
            radius++;
        }
        return { qx: targetQX, qy: targetQY };
    };

    const finalPositions = new Map<string, { x: number, y: number }>();

    // Snap Linked Nodes
    simNodes.sort((a, b) => (a.x * a.x + a.y * a.y) - (b.x * b.x + b.y * b.y)).forEach(sn => {
        const { qx: tQX, qy: tQY } = cartesianToSquare(sn.x, sn.y);
        const { qx, qy } = findNearestFree(tQX, tQY);
        grid.set(`${qx},${qy}`, sn.id);
        finalPositions.set(sn.id, squareToCartesian(qx, qy));
    });

    // 4. Gap Filling (Unlinked Nodes)
    unlinkedNodes.forEach(un => {
        const { qx, qy } = findNearestFree(0, 0); // Start spiral from center
        grid.set(`${qx},${qy}`, un.id);
        finalPositions.set(un.id, squareToCartesian(qx, qy));
    });

    // 5. Apply Results
    return nodes.map(node => {
        const pos = finalPositions.get(node.id) || { x: 0, y: 0 };
        return {
            ...node,
            position: pos,
            targetPosition: 'top' as any,
            sourcePosition: 'bottom' as any,
        };
    });
};

/**
 * Main Layout Entry Point
 */
export const getGroupedGridLayout = (nodes: Node[], edges: Edge[]) => {
    return getForceDirectedLayout(nodes, edges);
};
