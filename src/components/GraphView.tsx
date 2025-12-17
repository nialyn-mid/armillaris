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
import { MdQuestionAnswer, MdUnfoldLess, MdUnfoldMore, MdAdd } from 'react-icons/md';
import { GoDotFill } from 'react-icons/go';
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

interface ChatMessage {
    id: string;
    role: 'user' | 'system';
    content: string;
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

    // Chat History & UI State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true); // Used to toggle expanded view logic if needed, but per user request history is always there/dynamic.
    // Actually user said: "history not visible... when I disable [overflow hidden] it is". 
    // And "when there is no content it shouldn't be very tall... but when multiple... expand".
    // So we don't need a toggle for history visibility anymore? 
    // Wait, the user said "the one that opens the chat history (it doesn't seem to do anything) will use Question Answer and be highlighted blue".
    // This implies there IS a toggle to show/hide history.
    // If OFF: Hide history (collapse to input only).
    // If ON: Show history (dynamic height).

    // So:
    // isChatHistoryOpen = true -> Show history panel.
    // isChatCollapsed = true -> Collapse EVERYTHING to just the header bar (minimize).

    const [isChatCollapsed, setIsChatCollapsed] = useState(false);

    // Editing State
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

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
    useEffect(() => { localStorage.setItem('graphview_chat_input', chatInput); }, [chatInput]);
    useEffect(() => { localStorage.setItem('graphview_right_panel_width', String(rightPanelWidth)); }, [rightPanelWidth]);
    useEffect(() => { localStorage.setItem('graphview_bottom_panel_height', String(bottomPanelHeight)); }, [bottomPanelHeight]);
    useEffect(() => { localStorage.setItem('graphview_split_ratio', String(splitRatio)); }, [splitRatio]);

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

    const processInput = () => {
        const val = chatInput.trim();
        //todo: do not process input, just have engine update. it will update the graph in real time based on all the history and message, send actually just moves the current message to the history
        if (val.length === 0) return;

        setChatHistory(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: val }]);

        setChatInput('');
    };

    const handleChatChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setChatInput(e.target.value);
        if (engine && e.target.value.trim().length > 0) {
            const result = engine.process(e.target.value);
            setMatches(result.matches);
            updateGraphHighlights(result.activated, setNodes, setEdges);
            setOutputs(engine.generateOutput(result.activated));
        } else {
            setMatches([]);
            updateGraphHighlights([], setNodes, setEdges);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processInput();
        }
    };

    // Chat Message Logic
    const startEditing = (msg: ChatMessage) => {
        setEditingMsgId(msg.id);
        setEditContent(msg.content);
    };

    const saveEdit = (id: string) => {
        setChatHistory(prev => prev.map(m => m.id === id ? { ...m, content: editContent } : m));
        setEditingMsgId(null);
    };

    const insertBotMessage = (index: number) => {
        const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'system', content: 'New Bot Message' };
        setChatHistory(prev => {
            const next = [...prev];
            next.splice(index + 1, 0, newMsg);
            return next;
        });
        startEditing(newMsg); // Auto enter edit mode? Maybe user wants to click. I'll let them click.
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', height: '100%', position: 'relative', overflow: 'hidden' }}>

            {/* Left Column: Graph + Chat + Spec Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

                {/* Graph Area */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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

                    {/* Chat Sandbox */}
                    <div className="floating-island" style={{
                        bottom: isChatCollapsed ? '0px' : '30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '70%',
                        maxWidth: '800px',
                        minWidth: '400px',
                        // Dynamic Height: Auto, but Max Height constrained
                        height: 'auto',
                        maxHeight: isChatCollapsed ? 'auto' : '80%',
                        marginBottom: isChatCollapsed ? '0' : '0',
                        transition: 'all 0.3s ease',
                        borderBottomLeftRadius: isChatCollapsed ? 0 : 8,
                        borderBottomRightRadius: isChatCollapsed ? 0 : 8,
                        background: 'rgba(37, 37, 38, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'visible' // Allow button shadow etc? Actually we need structure.
                    }}>
                        {/* Chat Header */}
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            padding: '6px 12px',
                            background: 'rgba(37, 37, 38, 0.4)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: isChatCollapsed ? 'none' : '1px solid rgba(48, 54, 61, 0.5)',
                            borderTopLeftRadius: '7px',
                            borderTopRightRadius: '7px',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <span className="unselectable" style={{ fontWeight: 600 }}>Chat Sandbox</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <GoDotFill className={`chat-status-dot ${chatHistory.length > 0 ? 'active' : 'inactive'}`} />
                                <button
                                    className="btn-icon"
                                    onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
                                    title="Toggle History"
                                    style={{ color: isChatHistoryOpen ? '#58a6ff' : 'inherit' }}
                                >
                                    <MdQuestionAnswer />
                                </button>
                                <button
                                    className="btn-icon"
                                    onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                                    title={isChatCollapsed ? "Expand" : "Collapse"}
                                >
                                    {isChatCollapsed ? <MdUnfoldMore /> : <MdUnfoldLess />}
                                </button>
                            </div>
                        </div>

                        {/* Chat History Panel (Above Input, inside Flex Grid) */}
                        {isChatHistoryOpen && !isChatCollapsed && (
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '10px',
                                background: 'var(--bg-secondary)',
                                borderTop: 'none', // Inside containment
                                minHeight: '50px', // Start small
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div className="unselectable" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>History</div>
                                {chatHistory.length === 0 && <div className="unselectable" style={{ opacity: 0.5, fontSize: '0.8rem' }}>No history</div>}

                                {chatHistory.map((msg, idx) => (
                                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                        {/* Message */}
                                        <div
                                            style={{ marginBottom: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
                                            onClick={() => !editingMsgId && startEditing(msg)}
                                        >
                                            <span style={{ fontWeight: 600, color: msg.role === 'user' ? '#58a6ff' : '#7ee787' }}>
                                                {msg.role === 'user' ? 'YOU' : 'BOT'}:
                                            </span>
                                            {editingMsgId === msg.id ? (
                                                <input
                                                    autoFocus
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onBlur={() => saveEdit(msg.id)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent-color)', color: 'var(--text-primary)', marginLeft: '5px', width: '80%' }}
                                                />
                                            ) : (
                                                <span style={{ marginLeft: '5px' }}>{msg.content}</span>
                                            )}
                                        </div>

                                        {/* Separator + Bot Add Button */}
                                        <div className="chat-separator">
                                            <button className="chat-add-bot-btn" onClick={() => insertBotMessage(idx)} title="Add Bot Message here">
                                                <MdAdd /> Add Bot Message
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        {!isChatCollapsed && (
                            <div style={{ minHeight: '120px', position: 'relative', display: 'flex', padding: '0', flexShrink: 0 }}>
                                <div style={{ flex: 1, position: 'relative', borderBottomLeftRadius: '7px', borderBottomRightRadius: '7px' }}>
                                    <HighlightedTextarea
                                        value={chatInput}
                                        onChange={handleChatChange}
                                        onKeyDown={handleKeyDown}
                                        matches={matches}
                                    />
                                    {/* Floating Send Button */}
                                    <button
                                        onClick={() => processInput()}
                                        className="btn-primary"
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            bottom: '10px',
                                            width: 'auto',
                                            height: '28px',
                                            padding: '0 12px',
                                            fontSize: '0.8rem',
                                            zIndex: 10,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                        }}
                                        title="Send (Enter)"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Panel (Spec Editor) */}
                {showSpecEditor && (
                    <div style={{
                        height: bottomPanelHeight,
                        position: 'relative',
                        zIndex: 20,
                    }} className="panel bottom">
                        {/* Height Resize Handle (Top Edge) */}
                        <div
                            style={{
                                position: 'absolute', left: 0, top: -4, right: 0, height: '8px', cursor: 'ns-resize', zIndex: 30
                            }}
                            onMouseDown={(e) => {
                                const startY = e.clientY;
                                const startHeight = bottomPanelHeight;
                                const handleMouseMove = (ev: MouseEvent) => {
                                    setBottomPanelHeight(Math.max(150, Math.min(800, startHeight + (startY - ev.clientY))));
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

            {/* Right Panel (Output) */}
            {showOutput && (
                <div style={{
                    width: rightPanelWidth,
                    position: 'relative',
                    zIndex: 20,
                    borderLeft: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column'
                }} className="panel right">
                    {/* Width Resize Handle (Left Edge) */}
                    <div
                        style={{
                            position: 'absolute', left: -4, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 30
                        }}
                        onMouseDown={(e) => {
                            const startX = e.clientX;
                            const startWidth = rightPanelWidth;
                            const handleMouseMove = (ev: MouseEvent) => {
                                setRightPanelWidth(Math.max(200, Math.min(1000, startWidth + (startX - ev.clientX))));
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
                                setSplitRatio(Math.max(0.1, Math.min(0.9, startRatio + (ev.clientY - startY) / containerHeight)));
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
    );
}
