import { useEffect, useState, useMemo, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
    Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useData } from '../context/DataContext';
import { Engine } from '../lib/engine';
import { LabeledEdge } from './graph/LabeledEdge';
import { HighlightedTextarea } from './ui/HighlightedTextarea';
import { getLayoutedElements, nodeWidth } from '../lib/layout';

const edgeTypes = {
    labeled: LabeledEdge,
};

export default function GraphView() {
    const { graphData } = useData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Persistence: Chat Input
    const [chatInput, setChatInput] = useState(() => {
        return localStorage.getItem('graphview_chat_input') || '';
    });

    const [engine, setEngine] = useState<Engine | null>(null);
    const [matches, setMatches] = useState<any[]>([]);

    // Panel & Output System
    const [outputs, setOutputs] = useState({ personality: '', scenario: '' });

    // Persistence: Panel State (Collapsed/Width)
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(() => {
        const saved = localStorage.getItem('graphview_panel_collapsed');
        return saved === 'false' ? false : true; // Default true (collapsed)
    });

    const [panelWidth, setPanelWidth] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_panel_width') || '350', 10);
        return isNaN(saved) ? 350 : saved;
    });

    const [splitRatio, setSplitRatio] = useState(() => {
        const saved = parseFloat(localStorage.getItem('graphview_split_ratio') || '0.5');
        return isNaN(saved) ? 0.5 : saved;
    });

    // Persistence: Viewport
    // Retrieve initial viewport from sync storage or use default
    const defaultViewport = useMemo(() => {
        try {
            const saved = localStorage.getItem('graphview_viewport');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return { x: 0, y: 0, zoom: 1 };
    }, []);

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('graphview_chat_input', chatInput);
    }, [chatInput]);

    useEffect(() => {
        localStorage.setItem('graphview_panel_collapsed', String(isPanelCollapsed));
    }, [isPanelCollapsed]);

    useEffect(() => {
        localStorage.setItem('graphview_panel_width', String(panelWidth));
    }, [panelWidth]);

    useEffect(() => {
        localStorage.setItem('graphview_split_ratio', String(splitRatio));
    }, [splitRatio]);

    const onMoveEnd = useCallback((_: any, viewport: any) => {
        localStorage.setItem('graphview_viewport', JSON.stringify(viewport));
    }, []);

    // Initial Layout Effect
    useEffect(() => {
        if (graphData) {
            const initialNodes: Node[] = graphData.nodes.map(n => ({
                id: n.id,
                type: 'default', // Revert to default
                position: { x: 0, y: 0 }, // formatted by dagre
                data: { label: n.label, ...n.data },
                style: {
                    background: '#161b22',
                    color: '#f0f6fc',
                    border: '1px solid #30363d',
                    width: nodeWidth,
                }
            }));

            // Pre-process edges to merge bidirectional ones *before* layout?
            // Dagre handles multi-edges, but we want single edge visual.
            // If we feed single merged edge to Dagre, it might affect layout (good or bad).
            // Usually better to feed the simplified graph to layout.

            const edgeMap = new Map<string, { source: string, target: string, label: string }>();
            graphData.edges.forEach(e => {
                edgeMap.set(`${e.source}->${e.target}`, { source: e.source, target: e.target, label: e.label || '' });
            });

            const mergedEdges: Edge[] = [];
            const processedPairs = new Set<string>();

            graphData.edges.forEach(e => {
                // forwardKey unused
                // const forwardKey = `${e.source}->${e.target}`;
                const reverseKey = `${e.target}->${e.source}`;

                // Sort key to identify pair uniquely
                const pairKey = [e.source, e.target].sort().join('-');

                if (processedPairs.has(pairKey)) return;

                const reverseEdge = edgeMap.get(reverseKey);

                const defaultColor = '#30363d'; // Gray

                if (reverseEdge) {
                    // Bidirectional Found
                    // We create ONE edge. Direction?
                    // Usually doesn't matter for merged, but Dagre is directed.
                    // Keep the one that aligns with flow? Or just e.source -> e.target

                    mergedEdges.push({
                        id: `merged-${pairKey}`,
                        source: e.source,
                        target: e.target,
                        type: 'labeled', // Custom Edge
                        data: {
                            targetLabel: e.label, // Label for A->B (at Target end)
                            sourceLabel: reverseEdge.label, // Label for B->A (at Source end)
                            isActive: false
                        },
                        style: { stroke: defaultColor },
                        zIndex: 10,
                        // No markerEnd for now? bidirectional usually has arrows both ends or none?
                        // User didn't specify arrows, just "lines".
                        // But typically relation arrows help.
                        // If bidirectional, ideally arrows at both ends?
                        // ReactFlow markerEnd / markerStart
                        markerEnd: { type: 'arrowclosed' as any, color: defaultColor },
                        markerStart: { type: 'arrowclosed' as any, color: defaultColor },
                    });
                } else {
                    // One-sided
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

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                initialNodes,
                mergedEdges
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            // Re-create engine with current data
            const newEngine = new Engine(graphData);
            setEngine(newEngine);

            // Re-process chat input
            if (chatInput && newEngine) {
                const result = newEngine.process(chatInput);
                setMatches(result.matches);
                const out = newEngine.generateOutput(result.activated);
                setOutputs(out);

                const activeIds = result.activated;

                setNodes((nds) =>
                    nds.map((node) => {
                        const isActive = activeIds.includes(node.id);
                        // Force update style?
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

                setEdges((eds) =>
                    eds.map((edge) => {
                        const isEdgeActive = activeIds.includes(edge.source) && activeIds.includes(edge.target);
                        const color = isEdgeActive ? '#58a6ff' : '#30363d';
                        return {
                            ...edge,
                            zIndex: isEdgeActive ? 20 : 10,
                            data: {
                                ...edge.data,
                                isActive: isEdgeActive
                            },
                            style: {
                                ...edge.style,
                                stroke: color
                            },
                            markerEnd: edge.markerEnd ? { ...edge.markerEnd as any, color } : undefined,
                            markerStart: edge.markerStart ? { ...edge.markerStart as any, color } : undefined
                        };
                    })
                );
            }
        }
    }, [graphData, setNodes, setEdges]); // Only re-run if graphData changes significantly

    // Chat / Sandbox Logic
    const processInput = (val: string, eng: Engine | null = engine) => {
        if (eng && val.trim().length > 0) {
            const result = eng.process(val);
            const activeIds = result.activated;
            setMatches(result.matches);

            // Generate Outputs
            const out = eng.generateOutput(activeIds);
            setOutputs(out);

            setNodes((nds) =>
                nds.map((node) => {
                    const isActive = activeIds.includes(node.id);
                    return {
                        ...node,
                        style: {
                            ...node.style,
                            background: isActive ? '#1f6feb' : '#161b22', // Blue if active
                            borderColor: isActive ? '#58a6ff' : '#30363d',
                        }
                    };
                })
            );

            setEdges((eds) =>
                eds.map((edge) => {
                    const isEdgeActive = activeIds.includes(edge.source) && activeIds.includes(edge.target);
                    const color = isEdgeActive ? '#58a6ff' : '#30363d';
                    return {
                        ...edge,
                        zIndex: isEdgeActive ? 20 : 10,
                        data: {
                            ...edge.data,
                            isActive: isEdgeActive
                        },
                        style: {
                            ...edge.style,
                            stroke: color
                        },
                        markerEnd: edge.markerEnd ? { ...edge.markerEnd as any, color } : undefined,
                        markerStart: edge.markerStart ? { ...edge.markerStart as any, color } : undefined
                    };
                })
            );
        } else {
            // Reset
            setMatches([]);
            setOutputs({ personality: '', scenario: '' });
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    style: {
                        ...node.style,
                        background: '#161b22',
                        borderColor: '#30363d',
                    }
                }))
            );

            setEdges((eds) =>
                eds.map((edge) => ({
                    ...edge,
                    zIndex: 10,
                    data: { ...edge.data, isActive: false },
                    style: { ...edge.style, stroke: '#30363d' },
                    markerEnd: edge.markerEnd ? { ...edge.markerEnd as any, color: '#30363d' } : undefined,
                    markerStart: edge.markerStart ? { ...edge.markerStart as any, color: '#30363d' } : undefined
                }))
            );
        }
    };

    const handleChatChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setChatInput(val);
        processInput(val);
    };

    const handleClearChat = () => {
        setChatInput('');
        processInput('');
    };

    return (
        <div style={{ flex: 1, display: 'flex', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Main Content (Graph + Input) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        edgeTypes={edgeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        // Fit view removed in favor of defaultViewport
                        defaultViewport={defaultViewport}
                        onMoveEnd={onMoveEnd}
                        className="dark-theme"
                    >
                        <Background color="#30363d" gap={16} />
                        <Controls />
                        <Panel position="top-right" style={{ color: '#8b949e', fontSize: '12px' }}>
                            {nodes.length} nodes, {edges.length} edges
                        </Panel>
                    </ReactFlow>

                    {/* Toggle Panel Button (if collapsed) */}
                    {isPanelCollapsed && (
                        <button
                            onClick={() => setIsPanelCollapsed(false)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 10,
                                background: 'var(--bg-tertiary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px 0 0 4px',
                                padding: '10px 4px',
                                cursor: 'pointer'
                            }}
                        >
                            ◀
                        </button>
                    )}
                </div>

                {/* Chat/Sandbox Area */}
                <div style={{
                    height: '150px',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 10,
                    position: 'relative' // Context for tooltip?
                }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '5px 10px', background: '#252526', display: 'flex', justifyContent: 'space-between' }}>
                        <span className="unselectable">Engine Sandbox {matches.length > 0 && <span style={{ marginLeft: '10px', color: '#79c0ff' }}>{matches.length} Matches</span>}</span>
                        {chatInput.length > 0 && (
                            <button
                                onClick={handleClearChat}
                                style={{
                                    background: 'transparent',
                                    padding: '0px 2rem',
                                    border: 'none',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem'
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <HighlightedTextarea
                            value={chatInput}
                            onChange={handleChatChange}
                            matches={matches}
                        />
                    </div>
                </div>
            </div>

            {/* Right Panel (Collapsible) */}
            {!isPanelCollapsed && (
                <div style={{
                    width: panelWidth,
                    borderLeft: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {/* Width Resize Handle (Left Edge) */}
                    <div
                        style={{
                            position: 'absolute',
                            left: -4,
                            top: 0,
                            bottom: 0,
                            width: '8px',
                            cursor: 'ew-resize',
                            zIndex: 20
                        }}
                        onMouseDown={(e) => {
                            const startX = e.clientX;
                            const startWidth = panelWidth;

                            const handleMouseMove = (ev: MouseEvent) => {
                                const delta = startX - ev.clientX; // Left drag increases width
                                let newWidth = startWidth + delta;
                                if (newWidth < 200) newWidth = 200;
                                if (newWidth > 800) newWidth = 800;
                                setPanelWidth(newWidth);
                            };
                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };
                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }}
                    />

                    {/* Header */}
                    <div style={{
                        padding: '10px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#252526'
                    }}>
                        <span className="unselectable" style={{ fontWeight: 600, color: '#e0e0e0' }}>Activation Outputs</span>
                        <button
                            onClick={() => setIsPanelCollapsed(true)}
                            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
                        >
                            ▶
                        </button>
                    </div>

                    {/* Personality */}
                    <div style={{ flex: splitRatio, display: 'flex', flexDirection: 'column', minHeight: '50px' }}>
                        <div className="unselectable" style={{ padding: '5px 10px', fontSize: '0.8rem', color: '#8b949e', background: '#1e1e1e' }}>Personality</div>
                        <textarea
                            readOnly
                            value={outputs.personality}
                            style={{
                                flex: 1,
                                resize: 'none',
                                background: '#0d1117',
                                color: '#e0e0e0',
                                border: 'none',
                                padding: '10px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    {/* Splitter */}
                    <div
                        style={{ height: '4px', background: '#30363d', cursor: 'ns-resize' }}
                        onMouseDown={(e) => {
                            const startY = e.clientY;
                            const startRatio = splitRatio;
                            const containerHeight = e.currentTarget.parentElement?.offsetHeight || 600;

                            const handleMouseMove = (ev: MouseEvent) => {
                                const delta = ev.clientY - startY;
                                // Convert px to ratio
                                const ratioDelta = delta / containerHeight;
                                let newRatio = startRatio + ratioDelta;
                                // Clamp
                                if (newRatio < 0.1) newRatio = 0.1;
                                if (newRatio > 0.9) newRatio = 0.9;
                                setSplitRatio(newRatio);
                            };
                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };
                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }}
                    />

                    {/* Scenario */}
                    <div style={{ flex: 1 - splitRatio, display: 'flex', flexDirection: 'column', minHeight: '50px' }}>
                        <div className="unselectable" style={{ padding: '5px 10px', fontSize: '0.8rem', color: '#8b949e', background: '#1e1e1e' }}>Scenario</div>
                        <textarea
                            readOnly
                            value={outputs.scenario}
                            style={{
                                flex: 1,
                                resize: 'none',
                                background: '#0d1117',
                                color: '#e0e0e0',
                                border: 'none',
                                padding: '10px',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

