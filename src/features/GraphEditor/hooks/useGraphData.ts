import { useEffect, useState, useCallback } from 'react';
import {
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import { useData } from '../../../context/DataContext';
import { Engine } from '../../../lib/engine';
import { getLayoutedElements, nodeWidth } from '../../../lib/layout';

export function useGraphData() {
    const { graphData } = useData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [engine, setEngine] = useState<Engine | null>(null);

    // Initial Layout Effect
    useEffect(() => {
        if (graphData) {
            const initialNodes: Node[] = graphData.nodes.map((n: any) => ({
                id: n.id,
                type: 'default',
                position: { x: 0, y: 0 },
                data: { label: n.label, ...n.data },
                style: {
                    background: '#161b22',
                    color: '#f0f6fc',
                    border: '1px solid #30363d',
                    width: nodeWidth,
                }
            }));

            const edgeMap = new Map<string, { source: string, target: string, label: string }>();
            graphData.edges.forEach((e: any) => {
                edgeMap.set(`${e.source}->${e.target}`, { source: e.source, target: e.target, label: e.label || '' });
            });

            const mergedEdges: Edge[] = [];
            const processedPairs = new Set<string>();

            graphData.edges.forEach((e: any) => {
                const reverseKey = `${e.target}->${e.source}`;
                const pairKey = [e.source, e.target].sort().join('-');

                if (processedPairs.has(pairKey)) return;

                const reverseEdge = edgeMap.get(reverseKey);
                const defaultColor = '#30363d';

                if (reverseEdge) {
                    mergedEdges.push({
                        id: `merged-${pairKey}`,
                        source: e.source,
                        target: e.target,
                        type: 'labeled',
                        data: {
                            targetLabel: e.label,
                            sourceLabel: reverseEdge.label,
                            isActive: false
                        },
                        style: { stroke: defaultColor },
                        zIndex: 10,
                        markerEnd: { type: 'arrowclosed' as any, color: defaultColor },
                        markerStart: { type: 'arrowclosed' as any, color: defaultColor },
                    });
                } else {
                    mergedEdges.push({
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        type: 'labeled',
                        data: {
                            targetLabel: e.label,
                            sourceLabel: null,
                            isActive: false
                        },
                        style: { stroke: defaultColor },
                        zIndex: 10,
                        markerEnd: { type: 'arrowclosed' as any, color: defaultColor }
                    });
                }
                processedPairs.add(pairKey);
            });

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, mergedEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            const newEngine = new Engine(graphData);
            setEngine(newEngine);
        }
    }, [graphData, setNodes, setEdges]);

    const updateHighlights = useCallback((activeIds: string[]) => {
        setNodes((nds: Node[]) =>
            nds.map((node) => {
                const isActive = activeIds.includes(node.id);
                return {
                    ...node,
                    style: {
                        ...node.style,
                        background: isActive ? '#1f6feb' : '#161b22',
                        borderColor: isActive ? '#58a6ff' : '#30363d',
                    }
                };
            })
        );
        setEdges((eds: Edge[]) =>
            eds.map((edge) => {
                const isEdgeActive = activeIds.includes(edge.source) && activeIds.includes(edge.target);
                const color = isEdgeActive ? '#58a6ff' : '#30363d';
                return {
                    ...edge,
                    zIndex: isEdgeActive ? 20 : 10,
                    data: { ...edge.data, isActive: isEdgeActive },
                    style: { ...edge.style, stroke: color },
                    markerEnd: edge.markerEnd ? { ...edge.markerEnd as any, color } : undefined,
                    markerStart: edge.markerStart ? { ...edge.markerStart as any, color } : undefined
                };
            })
        );
    }, [setNodes, setEdges]);

    return {
        nodes, onNodesChange,
        edges, onEdgesChange,
        engine,
        updateHighlights
    };
}
