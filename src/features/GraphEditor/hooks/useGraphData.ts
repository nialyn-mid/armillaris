import { useEffect, useCallback, useRef, useState } from 'react';
import {
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import { useData } from '../../../context/DataContext';
import { nodeWidth, getGroupedGridLayout } from '../lib/layout';

export function useGraphData() {
    const { graphData, updateEntryPosition, showNotification } = useData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isArranging, setIsArranging] = useState(false);
    const [isArrangeLocked, setIsArrangeLocked] = useState(() => {
        return localStorage.getItem('graph_arrange_locked') === 'true';
    });
    const [layoutNonce, setLayoutNonce] = useState(0);

    useEffect(() => {
        localStorage.setItem('graph_arrange_locked', String(isArrangeLocked));
    }, [isArrangeLocked]);
    const prevGraphDataRef = useRef<any>(null);

    // Advanced "Arrange" (Grouped-Grid)
    const arrangeNodes = useCallback(() => {
        if (isArrangeLocked) return;
        setIsArranging(true);

        // Defer execution to allow React to render the loading state
        setTimeout(() => {
            try {
                setNodes((nds) => {
                    const arrangedNodes = getGroupedGridLayout([...nds], [...edges]);

                    // Save positions back to global state
                    arrangedNodes.forEach(n => {
                        updateEntryPosition(n.id, n.position);
                    });

                    setLayoutNonce(n => n + 1);
                    return arrangedNodes;
                });
            } catch (err) {
                console.error('[Graph] Arrangement failed', err);
                showNotification('Graph arrangement failed.', 'error');
            } finally {
                setIsArranging(false);
            }
        }, 50); // Short delay for UI update
    }, [edges, updateEntryPosition, setNodes, showNotification, isArrangeLocked]);

    // Initial Layout & Update Effect
    useEffect(() => {
        if (!graphData) return;

        const currentIds = graphData.nodes.map((n: any) => n.id).sort().join(',');
        const prevIds = prevGraphDataRef.current?.nodes.map((n: any) => n.id).sort().join(',');

        if (currentIds !== prevIds) {
            setNodes((currentNodes) => {
                const initialNodes: Node[] = graphData.nodes.map((n: any) => {
                    const localNode = currentNodes.find(ln => ln.id === n.id);

                    return {
                        id: n.id,
                        type: 'default',
                        position: n.position || localNode?.position,
                        data: { label: n.label, ...n.data },
                        zIndex: 10,
                        targetPosition: 'top' as any,
                        sourcePosition: 'bottom' as any,
                        style: {
                            background: '#161b22',
                            color: '#f0f6fc',
                            border: '1px solid #30363d',
                            width: nodeWidth,
                            height: 48,
                        }
                    };
                });

                const nodesToGrid = initialNodes.filter(n => n.position === undefined);
                const nodesWithPos = initialNodes.filter(n => n.position !== undefined);

                let intermediateNodes = initialNodes;

                if (nodesToGrid.length > 0) {
                    if (nodesWithPos.length === 0) {
                        const tempEdges: Edge[] = graphData.edges.map((e: any) => ({
                            id: e.id,
                            source: e.source,
                            target: e.target
                        }));
                        intermediateNodes = getGroupedGridLayout(initialNodes, tempEdges);
                    } else {
                        const griddedNew = nodesToGrid.map((n, i) => {
                            const cols = 5;
                            return {
                                ...n,
                                position: {
                                    x: (i % cols) * 180,
                                    y: (Math.floor(i / cols) * 60) + 600
                                }
                            };
                        });
                        intermediateNodes = [...nodesWithPos, ...griddedNew];
                    }
                }

                // Push initial positions to global state if they were just generated
                intermediateNodes.forEach(n => {
                    if (n.position) {
                        updateEntryPosition(n.id, n.position);
                    }
                });

                setLayoutNonce(n => n + 1);

                return intermediateNodes.map(n => ({
                    ...n,
                    position: (n.position && !isNaN(n.position.x) && !isNaN(n.position.y))
                        ? n.position
                        : { x: 0, y: 0 }
                }));
            });

            // Handle Edges - Merge bidirectional
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
                        zIndex: 5,
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
                        zIndex: 5,
                        markerEnd: { type: 'arrowclosed' as any, color: defaultColor }
                    });
                }
                processedPairs.add(pairKey);
            });

            setEdges(mergedEdges);
            prevGraphDataRef.current = graphData;
        } else {
            // Update labels/data without changing positions
            setNodes((nds) => {
                let changed = false;
                const nextNodes = nds.map(node => {
                    const updated = graphData.nodes.find((n: any) => n.id === node.id);
                    if (!updated) return node;

                    const newData = { label: updated.label, ...updated.data };
                    if (JSON.stringify(node.data) !== JSON.stringify(newData)) {
                        changed = true;
                        return { ...node, data: newData };
                    }
                    return node;
                });
                return changed ? nextNodes : nds;
            });
        }
    }, [graphData, setNodes, setEdges, updateEntryPosition]);

    const handleNodesChange = (changes: any[]) => {
        onNodesChange(changes);
        changes.forEach(c => {
            if (c.type === 'position' && c.position && !c.dragging) {
                updateEntryPosition(c.id, c.position);
            }
        });
    };

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
                    zIndex: isEdgeActive ? 20 : 5,
                    data: { ...edge.data, isActive: isEdgeActive },
                    style: { ...edge.style, stroke: color },
                    markerEnd: edge.markerEnd ? { ...edge.markerEnd as any, color } : undefined,
                    markerStart: edge.markerStart ? { ...edge.markerStart as any, color } : undefined
                };
            })
        );
    }, [setNodes, setEdges]);

    return {
        nodes, onNodesChange: handleNodesChange,
        edges, onEdgesChange,
        updateHighlights,
        arrangeNodes,
        isArranging,
        layoutNonce,
        isArrangeLocked, setIsArrangeLocked
    };
}
