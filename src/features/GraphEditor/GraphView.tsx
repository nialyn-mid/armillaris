import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import { ResizeHandle } from '../../shared/ui/ResizeHandle';
import './GraphEditor.css';

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

    // Resize Refs
    const startValRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="graph-view-root">

            {/* Left Column: Graph + Chat + Spec Editor */}
            <div className="graph-column-left">

                {/* Graph Area */}
                <div className="graph-area">
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
                    <div
                        className="spec-editor-panel"
                        style={{ height: bottomPanelHeight }}
                    >
                        <ResizeHandle
                            orientation="vertical"
                            className="handle-top" // Add styling if needed, default is invisible hitbox
                            style={{ top: -4, height: 8, cursor: 'ns-resize' }}
                            onDragStart={() => startValRef.current = bottomPanelHeight}
                            onResize={(delta) => {
                                // Dragging down (positive delta) decreases height (panel is at bottom)
                                setBottomPanelHeight(Math.max(150, Math.min(800, startValRef.current - delta)));
                            }}
                        />
                        <SpecNodeEditor />
                    </div>
                )}
            </div>

            {/* Right Panel (Output) */}
            {showOutput && (
                <div
                    ref={containerRef}
                    className="output-panel"
                    style={{ width: rightPanelWidth }}
                >
                    <ResizeHandle
                        orientation="horizontal"
                        style={{ left: -4, width: 8, cursor: 'ew-resize' }}
                        onDragStart={() => startValRef.current = rightPanelWidth}
                        onResize={(delta) => {
                            // Dragging left (negative delta) increases width (panel is at right)
                            setRightPanelWidth(Math.max(200, Math.min(1000, startValRef.current - delta)));
                        }}
                    />

                    <div className="output-panel-header unselectable">
                        <span>Activation Outputs</span>
                    </div>

                    <div className="output-textarea-container" style={{ flex: splitRatio }}>
                        <div className="output-subheader">Personality</div>
                        <textarea
                            readOnly
                            value={outputs.personality}
                            className="output-textarea"
                        />
                    </div>

                    {/* Splitter */}
                    <div style={{ position: 'relative', height: 4, background: 'var(--border-color)' }}>
                        <ResizeHandle
                            orientation="vertical"
                            style={{ top: -2, height: 8, cursor: 'ns-resize' }}
                            onDragStart={() => startValRef.current = splitRatio}
                            onResize={(delta) => {
                                const containerH = containerRef.current?.offsetHeight || 600;
                                // Normalized delta
                                const ratioDelta = delta / containerH;
                                setSplitRatio(Math.max(0.1, Math.min(0.9, startValRef.current + ratioDelta)));
                            }}
                        />
                    </div>

                    <div className="output-textarea-container" style={{ flex: 1 - splitRatio }}>
                        <div className="output-subheader">Scenario</div>
                        <textarea
                            readOnly
                            value={outputs.scenario}
                            className="output-textarea"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
