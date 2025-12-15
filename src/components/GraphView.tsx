
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
import SpecNodeEditor from './SpecEditor/SpecNodeEditor';

const edgeTypes = {
    labeled: LabeledEdge,
};

interface GraphViewProps {
    showOutput: boolean;
    showSpecEditor: boolean;
}

export default function GraphView({ showOutput, showSpecEditor }: GraphViewProps) {
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

    // Persistence: Panel Dimensions
    const [rightPanelWidth, setRightPanelWidth] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_right_panel_width') || '400', 10);
        return isNaN(saved) ? 400 : saved;
    });

    const [bottomPanelHeight, setBottomPanelHeight] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_bottom_panel_height') || '300', 10);
        return isNaN(saved) ? 300 : saved;
    });

    const [splitRatio, setSplitRatio] = useState(() => {
        const saved = parseFloat(localStorage.getItem('graphview_split_ratio') || '0.5');
        return isNaN(saved) ? 0.5 : saved;
    });

    // Persistence: Viewport
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
        localStorage.setItem('graphview_right_panel_width', String(rightPanelWidth));
    }, [rightPanelWidth]);

    useEffect(() => {
        localStorage.setItem('graphview_bottom_panel_height', String(bottomPanelHeight));
    }, [bottomPanelHeight]);

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
            graphData.edges.forEach(e => {
                edgeMap.set(`${e.source}->${e.target}`, { source: e.source, target: e.target, label: e.label || '' });
            });

            const mergedEdges: Edge[] = [];
            const processedPairs = new Set<string>();

            graphData.edges.forEach(e => {
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

            if (chatInput && newEngine) {
                const result = newEngine.process(chatInput);
                setMatches(result.matches);
                const out = newEngine.generateOutput(result.activated);
                setOutputs(out);

                const activeIds = result.activated;
                updateGraphHighlights(activeIds, setNodes, setEdges);
            }
        }
    }, [graphData, setNodes, setEdges]);

    const updateGraphHighlights = (activeIds: string[], setNodes: any, setEdges: any) => {
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
    };

    const processInput = (val: string, eng: Engine | null = engine) => {
        if (eng && val.trim().length > 0) {
            const result = eng.process(val);
            const activeIds = result.activated;
            setMatches(result.matches);
            setOutputs(eng.generateOutput(activeIds));
            updateGraphHighlights(activeIds, setNodes, setEdges);
        } else {
            setMatches([]);
            setOutputs({ personality: '', scenario: '' });
            updateGraphHighlights([], setNodes, setEdges);
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

            {/* Top Area: Graph + Chat Overlay + Right Panel */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
                {/* Main Graph Area */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <ReactFlow
                        id="main-graph-view"
                        nodes={nodes}
                        edges={edges}
                        edgeTypes={edgeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
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

                    {/* Floating Chat Island */}
                    <div className="floating-island" style={{
                        bottom: '30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '70%',
                        maxWidth: '800px',
                        minWidth: '400px',
                        height: '140px'
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            padding: '6px 12px',
                            background: 'rgba(37, 37, 38, 0.4)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(48, 54, 61, 0.5)'
                        }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <span className="unselectable" style={{ fontWeight: 600 }}>Chat Sandbox</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className="unselectable">Matches: {matches.length}</span>
                                {chatInput.length > 0 && (
                                    <button onClick={handleClearChat} className="btn-icon" style={{ fontSize: '1rem', padding: '2px' }} title="Clear Chat">
                                        ×
                                    </button>
                                )}
                            </div>
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

                {/* Right Panel (Output) */}
                {showOutput && (
                    <div style={{
                        width: rightPanelWidth,
                        position: 'relative',
                        zIndex: 20
                    }} className="panel right">
                        {/* Width Resize Handle (Left Edge) */}
                        <div
                            style={{
                                position: 'absolute',
                                left: -4,
                                top: 0,
                                bottom: 0,
                                width: '8px',
                                cursor: 'ew-resize',
                                zIndex: 30
                            }}
                            onMouseDown={(e) => {
                                const startX = e.clientX;
                                const startWidth = rightPanelWidth;
                                const handleMouseMove = (ev: MouseEvent) => {
                                    const delta = startX - ev.clientX; // Left drag increases width
                                    let newWidth = startWidth + delta;
                                    if (newWidth < 200) newWidth = 200;
                                    if (newWidth > 1000) newWidth = 1000;
                                    setRightPanelWidth(newWidth);
                                };
                                const handleMouseUp = () => {
                                    window.removeEventListener('mousemove', handleMouseMove);
                                    window.removeEventListener('mouseup', handleMouseUp);
                                };
                                window.addEventListener('mousemove', handleMouseMove);
                                window.addEventListener('mouseup', handleMouseUp);
                            }}
                        />

                        <div className="panel-header">
                            <span className="unselectable">Activation Outputs</span>
                        </div>

                        <div style={{ flex: splitRatio, display: 'flex', flexDirection: 'column', minHeight: '50px' }}>
                            <div className="panel-subheader">Personality</div>
                            <textarea
                                readOnly
                                value={outputs.personality}
                                style={{ flex: 1, resize: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: 'none', padding: '10px', fontSize: '0.9rem' }}
                            />
                        </div>

                        <div
                            style={{ height: '4px', background: 'var(--border-color)', cursor: 'ns-resize' }}
                            onMouseDown={(e) => {
                                const startY = e.clientY;
                                const startRatio = splitRatio;
                                const containerHeight = e.currentTarget.parentElement?.offsetHeight || 600;
                                const handleMouseMove = (ev: MouseEvent) => {
                                    const delta = ev.clientY - startY;
                                    const ratioDelta = delta / containerHeight;
                                    let newRatio = startRatio + ratioDelta;
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

                        <div style={{ flex: 1 - splitRatio, display: 'flex', flexDirection: 'column', minHeight: '50px' }}>
                            <div className="panel-subheader">Scenario</div>
                            <textarea
                                readOnly
                                value={outputs.scenario}
                                style={{ flex: 1, resize: 'none', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: 'none', padding: '10px', fontSize: '0.9rem' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Panel (Spec Editor) */}
            {showSpecEditor && (
                <div style={{
                    height: bottomPanelHeight,
                    position: 'relative',
                    zIndex: 20
                }} className="panel bottom">
                    {/* Height Resize Handle (Top Edge) */}
                    <div
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: -4,
                            right: 0,
                            height: '8px',
                            cursor: 'ns-resize',
                            zIndex: 30
                        }}
                        onMouseDown={(e) => {
                            const startY = e.clientY;
                            const startHeight = bottomPanelHeight;
                            const handleMouseMove = (ev: MouseEvent) => {
                                const delta = startY - ev.clientY; // Up drag increases height
                                let newHeight = startHeight + delta;
                                if (newHeight < 150) newHeight = 150;
                                if (newHeight > 800) newHeight = 800;
                                setBottomPanelHeight(newHeight);
                            };
                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };
                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }}
                    />
                    <SpecNodeEditor />
                </div>
            )}

        </div>
    );
}
