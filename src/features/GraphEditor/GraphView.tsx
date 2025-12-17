import { useEffect, useState, useMemo, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
} from 'reactflow';
import { useChatSession } from './hooks/useChatSession';
import { ChatOverlay } from './components/ChatOverlay';
import { useGraphData } from './hooks/useGraphData';
import { LabeledEdge } from './graph/LabeledEdge';
import SpecNodeEditor from '../SpecEditor/SpecNodeEditor';

const edgeTypes = {
    labeled: LabeledEdge,
};

interface GraphViewProps {
    showOutput: boolean;
    showSpecEditor: boolean;
}



export default function GraphView({ showOutput, showSpecEditor }: GraphViewProps) {
    // Graph Data Hook
    const { nodes, edges, onNodesChange, onEdgesChange, engine, updateHighlights } = useGraphData();

    // Chat Session
    const session = useChatSession();

    // Chat & Graph Interaction State
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

    useEffect(() => { localStorage.setItem('graphview_right_panel_width', String(rightPanelWidth)); }, [rightPanelWidth]);
    useEffect(() => { localStorage.setItem('graphview_bottom_panel_height', String(bottomPanelHeight)); }, [bottomPanelHeight]);
    useEffect(() => { localStorage.setItem('graphview_split_ratio', String(splitRatio)); }, [splitRatio]);

    const onMoveEnd = useCallback((_: any, viewport: any) => {
        localStorage.setItem('graphview_viewport', JSON.stringify(viewport));
    }, []);



    const onChatInputChange = (val: string) => {
        if (engine && val.trim().length > 0) {
            const result = engine.process(val);
            setMatches(result.matches);
            updateHighlights(result.activated);
            setOutputs(engine.generateOutput(result.activated));
        } else {
            setMatches([]);
            updateHighlights([]);
        }
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
                    <ChatOverlay
                        session={session}
                        matches={matches}
                        onInputChange={onChatInputChange}
                    />
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
